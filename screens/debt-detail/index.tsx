import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import dayjs from 'dayjs';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Money, ProgressBar, PALETTE, Row, IconBadge } from '@/components/ui';
import { useDebts } from '@/contexts/DebtContext';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { simulateSingleDebt, monthsElapsed } from '@/utils/payoff';
import { fmtMoney, parseMoney } from '@/utils/money';

const TYPE_ICON: Record<string, string> = {
  信用卡: 'credit-card',
  网贷: 'mobile-screen',
  消费分期: 'tags',
  房贷: 'house',
  车贷: 'car',
  亲友借款: 'handshake',
  其他: 'circle-dollar',
};

export default function DebtDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();
  const { debts, payments, deleteDebt } = useDebts();
  const [simVisible, setSimVisible] = useState(false);
  const [extra, setExtra] = useState('');

  const debt = useMemo(() => debts.find((d) => d.id === id), [debts, id]);

  const detail = useMemo(() => {
    if (!debt) return null;
    const paidPrincipal = Math.max(0, debt.originalPrincipal - debt.principal);
    const progress =
      debt.originalPrincipal > 0
        ? Math.min(1, paidPrincipal / debt.originalPrincipal)
        : 0;
    const remainingSim = simulateSingleDebt(debt.principal, debt.annualRate, debt.minPayment);
    const totalInterestFull = simulateSingleDebt(debt.originalPrincipal, debt.annualRate, debt.minPayment);
    const paidInterestEstimate = Math.max(
      0,
      r2v(totalInterestFull.totalInterest - remainingSim.totalInterest)
    );
    const elapsed = monthsElapsed(debt.startDate);
    return {
      paidPrincipal,
      progress,
      remainingInterest: remainingSim.totalInterest,
      totalInterest: totalInterestFull.totalInterest,
      paidInterestEstimate,
      remainingMonths: remainingSim.months,
      elapsed,
    };
  }, [debt]);

  const simResult = useMemo(() => {
    if (!debt || !detail) return null;
    const extraAmt = parseMoney(extra);
    if (extraAmt <= 0 || extraAmt > debt.principal) return null;
    const newSim = simulateSingleDebt(debt.principal - extraAmt, debt.annualRate, debt.minPayment);
    const saveInterest = Math.max(0, detail.remainingInterest - newSim.totalInterest);
    const saveMonths = Math.max(0, detail.remainingMonths - newSim.months);
    return { saveInterest, saveMonths };
  }, [debt, detail, extra]);

  if (!debt || !detail) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-400">债务不存在或已删除</Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600">
            <Text className="text-white">返回</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const debtPayments = payments
    .filter((p) => p.debtId === debt.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const doDelete = () => {
    Alert.alert('删除债务', `确定删除「${debt.name}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          deleteDebt(debt.id);
          Toast.show({ type: 'success', text1: '已删除' });
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <FontAwesome6 name="arrow-left" size={16} color="#64748B" />
          </TouchableOpacity>
          <Text className="text-slate-900 dark:text-white text-lg font-bold">{debt.name}</Text>
          <View className="h-9 w-9" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* 头部卡片 */}
        <Card className="mt-1">
          <View className="flex-row items-center">
            <IconBadge icon={TYPE_ICON[debt.type] || 'circle-dollar'} color={PALETTE.accent} size={44} />
            <View className="flex-1 ml-3">
              <Row label="债务类型">
                <Text className="text-slate-800 dark:text-slate-100 text-sm">{debt.type}</Text>
              </Row>
              <Row label="年化利率">
                <Money value={debt.annualRate} className="text-slate-800 dark:text-slate-100 text-sm" />
                <Text className="text-slate-400 text-xs ml-1">%</Text>
              </Row>
            </View>
          </View>
          <View className="flex-row mt-3 gap-3">
            <Card className="flex-1 items-center" style={{ padding: 12, backgroundColor: '#EEF2FF' }}>
              <Text className="text-slate-500 text-xs">剩余本金</Text>
              <Money value={debt.principal} className="text-blue-700 text-lg font-bold mt-1" />
            </Card>
            <Card className="flex-1 items-center" style={{ padding: 12, backgroundColor: '#ECFDF5' }}>
              <Text className="text-slate-500 text-xs">已还本金</Text>
              <Money value={detail.paidPrincipal} className="text-emerald-700 text-lg font-bold mt-1" />
            </Card>
          </View>
        </Card>

        {/* 还款进度 */}
        <Card className="mt-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-slate-900 dark:text-white text-base font-semibold">还款进度</Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm font-mono">{Math.round(detail.progress * 100)}%</Text>
          </View>
          <ProgressBar value={detail.progress} color={detail.progress >= 0.5 ? PALETTE.success : PALETTE.accent} height={12} />
          <View className="mt-3">
            <Row label="起始日期">
              <Text className="text-slate-700 dark:text-slate-200 text-sm">{debt.startDate}</Text>
            </Row>
            <Row label="账单日 / 还款日">
              <Text className="text-slate-700 dark:text-slate-200 text-sm">{debt.billDay} 日 / {debt.dueDay} 日</Text>
            </Row>
            <Row label="每期最低还款">
              <Money value={debt.minPayment} className="text-slate-700 dark:text-slate-200 text-sm" />
            </Row>
            {!!debt.note && (
              <Row label="备注">
                <Text className="text-slate-700 dark:text-slate-200 text-sm flex-1 text-right">{debt.note}</Text>
              </Row>
            )}
          </View>
        </Card>

        {/* 利息估算 */}
        <Card className="mt-3">
          <Text className="text-slate-900 dark:text-white text-base font-semibold mb-2">利息估算</Text>
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <Text className="text-slate-400 dark:text-slate-500 text-xs">已付利息(估算)</Text>
              <Money value={detail.paidInterestEstimate} className="text-rose-600 dark:text-rose-400 text-base font-bold mt-1" />
            </View>
            <View className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <Text className="text-slate-400 dark:text-slate-500 text-xs">剩余利息(估算)</Text>
              <Money value={detail.remainingInterest} className="text-slate-800 dark:text-slate-100 text-base font-bold mt-1" />
            </View>
          </View>
          <Text className="text-slate-400 dark:text-slate-500 text-xs mt-3 leading-4">
            按当前本金和{debt.annualRate}%年利率，以月还最低计算，预计还需 {detail.remainingMonths || 0} 个月结清。
          </Text>
        </Card>

        {/* 提前还款模拟 */}
        <TouchableOpacity onPress={() => { setSimVisible(true); setExtra(''); }}>
          <Card className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <IconBadge icon="rocket" color={PALETTE.info} size={38} />
              <View className="ml-3">
                <Text className="text-slate-900 dark:text-white text-base font-semibold">提前还款模拟器</Text>
                <Text className="text-slate-400 text-xs mt-0.5">测算节省利息与提前结清月数</Text>
              </View>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" />
          </Card>
        </TouchableOpacity>

        {/* 还款历史 */}
        <View className="mt-4 mb-1">
          <Text className="text-slate-900 dark:text-white text-base font-semibold">还款记录（{debtPayments.length}）</Text>
        </View>
        {debtPayments.length === 0 ? (
          <Card className="mt-1">
            <Text className="text-slate-400 dark:text-slate-500 text-sm text-center py-4">暂无还款记录，去「记录」页添加</Text>
          </Card>
        ) : (
          <Card className="mt-1">
            {debtPayments.map((p, i) => (
              <View key={p.id} className={`py-2.5 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-slate-700 dark:text-slate-200 text-sm">{p.date}</Text>
                  <Money value={p.amount} className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold" signed />
                </View>
                {!!p.note && <Text className="text-slate-400 text-xs mt-0.5">{p.note}</Text>}
              </View>
            ))}
          </Card>
        )}

        <TouchableOpacity
          onPress={doDelete}
          className="mt-6 py-3.5 rounded-2xl items-center bg-red-50 dark:bg-red-950/40"
        >
          <Text className="text-red-500 text-base font-medium">删除该债务</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 提前还款模拟弹窗 */}
      <Modal visible={simVisible} transparent animationType="slide" onRequestClose={() => setSimVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-5" style={{ paddingBottom: Platform.OS === 'ios' ? 30 : 16 }}>
              <Text className="text-slate-900 dark:text-white text-lg font-bold mb-1">提前还款测算</Text>
              <Text className="text-slate-400 text-sm mb-4">额外还一笔钱，看看能省多少利息</Text>

              <Text className="text-slate-600 dark:text-slate-300 text-sm mb-1.5">额外还款金额（元）</Text>
              <TextInput
                value={extra}
                onChangeText={setExtra}
                placeholder="5000"
                keyboardType="decimal-pad"
                className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-base font-mono"
                placeholderTextColor="#94A3B8"
              />
              {simResult ? (
                <View className="mt-4 flex-row gap-3">
                  <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: '#ECFDF5' }}>
                    <Text className="text-slate-500 text-xs">可节省利息</Text>
                    <Money value={simResult.saveInterest} className="text-emerald-600 text-lg font-bold mt-1" />
                  </View>
                  <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: '#EFF6FF' }}>
                    <Text className="text-slate-500 text-xs">提前结清</Text>
                    <Text className="text-blue-700 text-lg font-bold mt-1" style={{ fontFamily: 'Menlo' }}>
                      {simResult.saveMonths} 个月
                    </Text>
                  </View>
                </View>
              ) : (
                <Text className="text-slate-400 text-xs mt-3">输入 0 ~ {fmtMoney(debt.principal)} 之间的金额进行测算</Text>
              )}

              <View className="flex-row gap-3 mt-5">
                <TouchableOpacity
                  onPress={() => setSimVisible(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 items-center"
                >
                  <Text className="text-slate-600 dark:text-slate-300 text-base font-medium">关闭</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function r2v(n: number): number {
  return Math.round(n * 100) / 100;
}