import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Screen } from '@/components/Screen';
import { Card, Money, EmptyState, PALETTE, chartOrder, IconBadge } from '@/components/ui';
import PaymentFormModal from '@/components/forms/PaymentFormModal';
import { useDebts } from '@/contexts/DebtContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import type { Payment } from '@/types';
import { fmtMoney } from '@/utils/money';

const TYPE_ICON: Record<string, string> = {
  信用卡: 'credit-card',
  网贷: 'mobile-screen',
  消费分期: 'tags',
  房贷: 'house',
  车贷: 'car',
  亲友借款: 'handshake',
  其他: 'circle-dollar',
};

export default function RecordsScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { payments, debts, addPayment, updatePayment, deletePayment } = useDebts();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [filterDebtId, setFilterDebtId] = useState<string | null>(null);

  const debtMap = useMemo(() => {
    const m: Record<string, (typeof debts)[number]> = {};
    debts.forEach((d) => (m[d.id] = d));
    return m;
  }, [debts]);

  const filtered = useMemo(
    () =>
      payments.filter((p) => (filterDebtId ? p.debtId === filterDebtId : true)),
    [payments, filterDebtId]
  );

  const totalPaid = useMemo(() => filtered.reduce((s, p) => s + p.amount, 0), [filtered]);

  const sections = useMemo(() => {
    const groups: Record<string, Payment[]> = {};
    filtered.forEach((p) => {
      const key = p.date.slice(0, 7);
      (groups[key] = groups[key] || []).push(p);
    });
    return Object.keys(groups)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((key) => ({
        title: key,
        data: groups[key].sort((a, b) => (a.date < b.date ? 1 : -1)),
        total: groups[key].reduce((s, p) => s + p.amount, 0),
      }));
  }, [filtered]);

  const confirmDelete = (p: Payment) => {
    const d = debtMap[p.debtId];
    Alert.alert(
      '删除记录',
      `删除后会将该笔 ¥${p.amount.toFixed(2)} 退回到「${d?.name || '债务'}」的剩余本金，确定？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            deletePayment(p.id);
            Toast.show({ type: 'success', text1: '已删除，剩余本金已恢复' });
          },
        },
      ]
    );
  };

  const activeDebts = debts.filter((d) => d.principal > 0.009);

  const renderItem = ({ item }: { item: Payment }) => {
    const d = debtMap[item.debtId];
    const color = chartOrder[(debts.findIndex((x) => x.id === item.debtId) + 7) % chartOrder.length];
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setEditing(item);
          setModalVisible(true);
        }}
      >
        <View className="flex-row items-center py-3 px-1">
          <IconBadge icon={TYPE_ICON[d?.type || '其他'] || 'circle-dollar'} color={color} size={40} />
          <View className="flex-1 ml-3">
            <Text className="text-slate-900 dark:text-white text-sm font-semibold">{d?.name || '已删除债务'}</Text>
            <Text className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{item.date}{item.note ? ` · ${item.note}` : ''}</Text>
          </View>
          <Money value={item.amount} className="text-emerald-600 dark:text-emerald-400 text-base font-semibold" signed />
          <TouchableOpacity onPress={() => confirmDelete(item)} className="ml-3 p-1">
            <FontAwesome6 name="trash" size={14} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: (typeof sections)[number] }) => (
    <View className="flex-row items-center justify-between px-1 mt-4 mb-1">
      <Text className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{section.title}</Text>
      <Text className="text-slate-500 dark:text-slate-400 text-xs font-mono">本月还 ¥{fmtMoney(section.total)}</Text>
    </View>
  );

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <View className="px-5 pb-3" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-slate-900 dark:text-white text-2xl font-bold">还款记录</Text>
          <TouchableOpacity
            onPress={() => { setEditing(null); setModalVisible(true); }}
            className="h-11 px-4 rounded-2xl flex-row items-center bg-blue-600"
          >
            <FontAwesome6 name="plus" size={14} color="#fff" />
            <Text className="text-white font-semibold ml-2">记一笔</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center justify-between mt-3">
          <Card style={{ padding: 12, flex: 1 }} className="mr-2">
            <Text className="text-slate-400 text-xs">筛选债务</Text>
            <TouchableOpacity onPress={() => setFilterDebtId(null)}>
              <Text className={`text-sm mt-0.5 ${!filterDebtId ? 'text-blue-600 font-medium' : 'text-slate-500'}`}>
                全部 · {payments.length} 条
              </Text>
            </TouchableOpacity>
          </Card>
          <Card style={{ padding: 12, flex: 1 }}>
            <Text className="text-slate-400 text-xs">当前筛选累计已还</Text>
            <Money value={totalPaid} className="text-emerald-600 text-base font-bold mt-0.5" />
          </Card>
        </View>
        {activeDebts.length > 0 && (
          <View className="flex-row mt-2 -mx-5 px-5">
            <View className="flex-row flex-wrap gap-2">
              {activeDebts.map((d) => (
                <TouchableOpacity key={d.id} onPress={() => setFilterDebtId(filterDebtId === d.id ? null : d.id)}>
                  <View className={`px-3 py-1.5 rounded-full ${filterDebtId === d.id ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Text className={`text-xs ${filterDebtId === d.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{d.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="receipt"
          title={filterDebtId ? '该债务暂无还款记录' : '还没有还款记录'}
          hint="每记一笔还款，对应债务的剩余本金会自动减少"
          action={
            activeDebts.length > 0 ? (
              <TouchableOpacity onPress={() => { setEditing(null); setModalVisible(true); }} className="mt-4 px-5 py-3 rounded-2xl bg-blue-600">
                <Text className="text-white font-medium">+ 记录第一笔还款</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="h-px bg-slate-100 dark:bg-slate-800" />}
        />
      )}

      <PaymentFormModal
        visible={modalVisible}
        data={editing}
        onClose={() => setModalVisible(false)}
        onSave={(p) => {
          if (editing) updatePayment({ ...p, id: editing.id, createdAt: editing.createdAt });
          else addPayment(p);
        }}
      />
    </Screen>
  );
}