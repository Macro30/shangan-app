import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import dayjs from 'dayjs';
import Toast from 'react-native-toast-message';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Row, PALETTE, Segmented } from '@/components/ui';
import { useDebts } from '@/contexts/DebtContext';
import { buildBackup, isValidBackup } from '@/utils/storage';
import { ensureNotificationSetup, scheduleAllReminders } from '@/utils/notifications';
import type { Strategy } from '@/types';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { debts, payments, settings, updateSettings, restoreAll } = useDebts();
  const [busy, setBusy] = useState(false);

  const storageInfo = useMemo(() => {
    const total = debts.reduce((s, d) => s + d.originalPrincipal, 0);
    const remain = debts.reduce((s, d) => s + d.principal, 0);
    return { total, remain, paid: total - remain, count: payments.length };
  }, [debts, payments]);

  const grantPermission = async () => {
    const ok = await ensureNotificationSetup();
    if (ok) {
      await scheduleAllReminders(debts);
      Toast.show({ type: 'success', text1: '已开启还款提醒' });
    } else {
      Toast.show({ type: 'error', text1: '未获得通知权限' });
    }
  };

  const exportData = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const backup = await buildBackup(debts, payments, settings);
      const name = `debt-backup-${dayjs().format('YYYYMMDD-HHmm')}.json`;
      const json = JSON.stringify(backup, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = (document as unknown as { createElement: (t: string) => HTMLAnchorElement }).createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        setBusy(false);
        return;
      }
      const uri = `${(FileSystem as any).documentDirectory}${name}`;
      await (FileSystem as any).writeAsStringAsync(uri, json);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: '导出债务数据' });
      }
      Toast.show({ type: 'success', text1: '已导出', text2: uri });
    } catch (err) {
      Toast.show({ type: 'error', text1: '导出失败', text2: String(err) });
    } finally {
      setBusy(false);
    }
  };

  const importData = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'application/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.length) {
        setBusy(false);
        return;
      }
      const asset = res.assets[0];
      let text = '';
      if (Platform.OS === 'web') {
        const file = asset as unknown as { text?: () => Promise<string>; name?: string };
        text = file.text ? await file.text() : '';
      } else {
        text = await (FileSystem as any).readAsStringAsync(asset.uri);
      }
      setBusy(false);
      const parsed = JSON.parse(text);
      if (!isValidBackup(parsed)) {
        Toast.show({ type: 'error', text1: '文件格式不正确，请选择导出的备份' });
        return;
      }
      Alert.alert(
        '恢复备份',
        `将用备份的数据（${parsed.debts.length} 笔债务、${parsed.payments.length} 条记录）覆盖当前数据，确定？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '导入并覆盖',
            style: 'destructive',
            onPress: () => {
              restoreAll(parsed.debts, parsed.payments, parsed.settings);
              Toast.show({ type: 'success', text1: '导入成功' });
            },
          },
        ]
      );
    } catch (err) {
      setBusy(false);
      Toast.show({ type: 'error', text1: '导入失败', text2: String(err) });
    }
  };

  const toggleRemind = (id: string, val: boolean) => {
    restoreAll(
      debts.map((d) => (d.id === id ? { ...d, remindEnabled: val } : d)),
      payments,
      settings
    );
    scheduleAllReminders(debts.map((d) => (d.id === id ? { ...d, remindEnabled: val } : d)));
  };

  const toggleRemindDays = (id: string, val: 0 | 1) => {
    restoreAll(
      debts.map((d) => (d.id === id ? { ...d, remindDays: val } : d)),
      payments,
      settings
    );
    scheduleAllReminders(debts.map((d) => (d.id === id ? { ...d, remindDays: val } : d)));
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-slate-900 dark:text-white text-2xl font-bold">设置</Text>
        <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1">数据仅保存在本机，自动同步还款提醒</Text>

        {/* 预算与策略 */}
        <Card className="mt-4">
          <Text className="text-slate-900 dark:text-white text-base font-semibold mb-1">还款偏好</Text>
          <Text className="text-slate-400 text-xs">每月还款预算（用于生成本月计划与分配建议）</Text>
          <TextInput
            value={settings.monthlyBudget > 0 ? String(settings.monthlyBudget) : ''}
            onChangeText={(t) => {
              const n = parseFloat(t.replace(/[^\d.]/g, ''));
              updateSettings({ monthlyBudget: Number.isNaN(n) || n <= 0 ? 0 : Math.round(n * 100) / 100 });
            }}
            placeholder="不设限"
            placeholderTextColor="#94A3B8"
            keyboardType="decimal-pad"
            className="mt-2 mb-3 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-base"
          />
          <Text className="text-slate-400 text-xs">还款策略</Text>
          <View className="mt-2">
            <Segmented<Strategy>
              value={settings.strategy}
              onChange={(v) => updateSettings({ strategy: v })}
              options={[
                { label: '雪球法', value: 'snowball' },
                { label: '雪崩法', value: 'avalanche' },
              ]}
            />
          </View>
        </Card>

        {/* 数据统计 */}
        <Card className="mt-4">
          <Text className="text-slate-900 dark:text-white text-base font-semibold mb-2">本机数据</Text>
          <Row label="债务笔数">
            <Text className="text-slate-700 dark:text-slate-200 text-sm">{debts.length} 笔</Text>
          </Row>
          <Row label="还款记录">
            <Text className="text-slate-700 dark:text-slate-200 text-sm">{storageInfo.count} 条</Text>
          </Row>
          <Row label="累计已还本金">
            <Text className="text-emerald-600 text-sm font-mono">¥{storageInfo.paid.toFixed(2)}</Text>
          </Row>
          <Row label="当前剩余本金">
            <Text className="text-slate-700 dark:text-slate-200 text-sm font-mono">¥{storageInfo.remain.toFixed(2)}</Text>
          </Row>
        </Card>

        {/* 通知提醒 */}
        <Card className="mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-slate-900 dark:text-white text-base font-semibold">还款日提醒</Text>
            <TouchableOpacity onPress={grantPermission} className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40">
              <Text className="text-blue-600 dark:text-blue-400 text-xs">授权通知</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-slate-400 text-xs mb-2">每笔债务可单独开启，还款日{''}当天或提前 1 天通知。</Text>
          {debts.length === 0 ? (
            <Text className="text-slate-400 text-sm text-center py-3">暂无债务</Text>
          ) : (
            debts.map((d) => (
              <View key={d.id} className="flex-row items-center py-2.5 border-t border-slate-100 dark:border-slate-800">
                <View className="flex-1">
                  <Text className="text-slate-800 dark:text-slate-100 text-sm">{d.name}</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    {d.dueDay} 日 · {d.remindDays === 0 ? '当天' : '提前 1 天'}
                  </Text>
                </View>
                <View style={{ flex: 0.7 }}>
                  <Segmented<0 | 1>
                    value={d.remindDays as 0 | 1}
                    onChange={(v) => toggleRemindDays(d.id, v)}
                    options={[{ label: '当天', value: 0 }, { label: '提前1天', value: 1 }]}
                  />
                </View>
                <Switch
                  value={d.remindEnabled}
                  onValueChange={(v) => toggleRemind(d.id, v)}
                  trackColor={{ false: '#CBD5E1', true: `${PALETTE.accent}99` }}
                  thumbColor={d.remindEnabled ? PALETTE.accent : '#F1F5F9'}
                />
              </View>
            ))
          )}
        </Card>

        {/* 数据备份 */}
        <Card className="mt-4">
          <Text className="text-slate-900 dark:text-white text-base font-semibold mb-2">数据备份</Text>
          <Text className="text-slate-400 text-xs mb-3">
            一键导出全部数据为 JSON 文件保存到手机，换机后可导入恢复。
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={exportData}
              disabled={busy}
              className="flex-1 py-3 rounded-xl items-center flex-row justify-center bg-blue-600"
            >
              {busy ? <ActivityIndicator color="#fff" size="small" /> : <FontAwesome6 name="download" size={14} color="#fff" />}
              <Text className="text-white font-medium ml-2">导出备份</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={importData}
              disabled={busy}
              className="flex-1 py-3 rounded-xl items-center flex-row justify-center bg-slate-100 dark:bg-slate-800"
            >
              <FontAwesome6 name="upload" size={14} color={PALETTE.accent} />
              <Text className="text-blue-600 dark:text-blue-400 font-medium ml-2">导入恢复</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-slate-400 dark:text-slate-500 text-xs mt-3 leading-4">
            提示：导出记录仅包含债务、还款记录与设置，金额以「元」为单位保留两位小数。
          </Text>
        </Card>

        {/* 关于 */}
        <Card className="mt-4">
          <View className="flex-row items-center gap-2 mb-2">
            <FontAwesome6 name="anchor" size={16} color={PALETTE.primary} />
            <Text className="text-slate-900 dark:text-white text-base font-semibold">上岸</Text>
          </View>
          <Row label="数据存储">
            <Text className="text-slate-700 dark:text-slate-200 text-sm">本机离线 · 未经您许可不上传云端</Text>
          </Row>
          <Row label="版本">
            <Text className="text-slate-500 text-sm">v1.0.0</Text>
          </Row>
        </Card>
      </ScrollView>
    </Screen>
  );
}