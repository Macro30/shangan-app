import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Screen } from '@/components/Screen';
import { Card, Money, EmptyState, Segmented, PALETTE, chartOrder, IconBadge } from '@/components/ui';
import DebtFormModal from '@/components/forms/DebtFormModal';
import { useDebts } from '@/contexts/DebtContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { DEBT_TYPES, type Debt, type DebtType } from '@/types';
import { fmtMoney } from '@/utils/money';

type SortKey = 'principal' | 'rate' | 'dueDay';

const DEBT_TYPE_ICON: Record<string, string> = {
  信用卡: 'credit-card',
  网贷: 'mobile-screen',
  消费分期: 'tags',
  房贷: 'house',
  车贷: 'car',
  亲友借款: 'handshake',
  其他: 'circle-dollar',
};

export default function DebtsScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { debts, addDebt, updateDebt, deleteDebt } = useDebts();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('principal');
  const [filterType, setFilterType] = useState<DebtType | '全部'>('全部');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    let list = [...debts];
    if (filterType !== '全部') list = list.filter((d) => d.type === filterType);
    list.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'principal') diff = a.principal - b.principal;
      else if (sortKey === 'rate') diff = a.annualRate - b.annualRate;
      else diff = a.dueDay - b.dueDay;
      return sortAsc ? diff : -diff;
    });
    return list;
  }, [debts, sortKey, filterType, sortAsc]);

  const total = useMemo(
    () => sorted.reduce((s, d) => s + d.principal, 0),
    [sorted]
  );

  const openAdd = () => {
    setEditing(null);
    setModalVisible(true);
  };
  const openEdit = (d: Debt) => {
    setEditing(d);
    setModalVisible(true);
  };
  const confirmDelete = (d: Debt) => {
    Alert.alert('删除债务', `确定删除「${d.name}」？其还款记录将一并删除。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          deleteDebt(d.id);
          Toast.show({ type: 'success', text1: '已删除' });
        },
      },
    ]);
  };

  const renderSortItem = (label: string, key: SortKey) => (
    <TouchableOpacity
      onPress={() => {
        if (sortKey === key) setSortAsc((v) => !v);
        else {
          setSortKey(key);
          setSortAsc(false);
        }
      }}
      className="flex-row items-center px-3 py-1.5 rounded-lg"
      style={{ backgroundColor: sortKey === key ? '#2563EB1a' : 'transparent' }}
    >
      <Text className={`text-sm ${sortKey === key ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </Text>
      {sortKey === key && (
        <FontAwesome6 name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color="#2563EB" style={{ marginLeft: 4 }} />
      )}
    </TouchableOpacity>
  );

  const renderItem = ({ item, index }: { item: Debt; index: number }) => {
    const progress =
      item.originalPrincipal > 0
        ? Math.min(1, Math.max(0, (item.originalPrincipal - item.principal) / item.originalPrincipal))
        : 0;
    return (
      <Card className="mb-3" style={{ padding: 16 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.navigate('/debt-detail', { id: item.id })}
        >
          <View className="flex-row items-center">
            <IconBadge icon={DEBT_TYPE_ICON[item.type] || 'circle-dollar'} color={chartOrder[index % chartOrder.length]} size={42} />
            <View className="flex-1 ml-3">
              <Text className="text-slate-900 dark:text-white text-base font-semibold">{item.name}</Text>
              <Text className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">
                {item.type} · {item.annualRate}% 年化 · 还款日 {item.dueDay} 日
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-slate-400 dark:text-slate-400 text-xs">剩余本金</Text>
              <Money value={item.principal} className="text-slate-900 dark:text-white text-base font-semibold mt-0.5" />
            </View>
          </View>

          <View className="mt-3 flex-row gap-3">
            <View className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5">
              <Text className="text-slate-400 dark:text-slate-500 text-xs">每期最低</Text>
              <Money value={item.minPayment} className="text-slate-800 dark:text-slate-100 text-sm mt-0.5 font-medium" />
            </View>
            <View className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5">
              <Text className="text-slate-400 dark:text-slate-500 text-xs">还款进度</Text>
              <Text className="text-slate-800 dark:text-slate-100 text-sm mt-0.5 font-medium">{Math.round(progress * 100)}%</Text>
            </View>
          </View>
          <View className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: progress >= 0.5 ? PALETTE.success : PALETTE.accent }}
            />
          </View>
        </TouchableOpacity>

        <View className="flex-row mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <TouchableOpacity
            onPress={() => openEdit(item)}
            className="flex-1 flex-row items-center justify-center py-2"
          >
            <FontAwesome6 name="pen" size={13} color={PALETTE.accent} />
            <Text className="text-blue-600 dark:text-blue-400 text-sm ml-1.5">编辑</Text>
          </TouchableOpacity>
          <View className="w-px bg-slate-100 dark:bg-slate-800" />
          <TouchableOpacity
            onPress={() => confirmDelete(item)}
            className="flex-1 flex-row items-center justify-center py-2"
          >
            <FontAwesome6 name="trash" size={13} color={PALETTE.danger} />
            <Text className="text-red-500 text-sm ml-1.5">删除</Text>
          </TouchableOpacity>
          <View className="w-px bg-slate-100 dark:bg-slate-800" />
          <TouchableOpacity
            onPress={() => router.navigate('/debt-detail', { id: item.id })}
            className="flex-1 flex-row items-center justify-center py-2"
          >
            <FontAwesome6 name="chart-line" size={13} color={PALETTE.success} />
            <Text className="text-emerald-600 dark:text-emerald-400 text-sm ml-1.5">详情</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const [filterVisible, setFilterVisible] = useState(false);

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <View className="px-5 pb-3" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-slate-900 dark:text-white text-2xl font-bold">债务</Text>
          <TouchableOpacity
            onPress={openAdd}
            className="h-11 px-4 rounded-2xl flex-row items-center bg-blue-600"
          >
            <FontAwesome6 name="plus" size={14} color="#fff" />
            <Text className="text-white font-semibold ml-2">新增债务</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          共 {sorted.length} 笔 · 合计剩余本金{' '}
          <Text className="font-mono text-slate-600 dark:text-slate-300">¥{fmtMoney(total)}</Text>
        </Text>
      </View>

      {/* 排序 + 筛选 */}
      <View className="px-5 pb-2 flex-row items-center gap-2">
        <View className="flex-1 flex-row">
          {renderSortItem('本金', 'principal')}
          {renderSortItem('利率', 'rate')}
          {renderSortItem('还款日', 'dueDay')}
        </View>
        <TouchableOpacity
          onPress={() => setFilterVisible((v) => !v)}
          className="flex-row items-center px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: filterType !== '全部' ? '#2563EB1a' : 'transparent' }}
        >
          <FontAwesome6 name="filter" size={13} color={filterType !== '全部' ? '#2563EB' : '#94A3B8'} />
          <Text className={`text-sm ml-1.5 ${filterType !== '全部' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {filterType === '全部' ? '类型' : filterType}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 类型筛选面板 */}
      {filterVisible && (
        <View className="px-5 pb-2">
          <View className="flex-row flex-wrap gap-2 rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            {(['全部', ...DEBT_TYPES] as (DebtType | '全部')[]).map((t) => {
              const active = filterType === t;
              return (
                <Pressable key={t} onPress={() => setFilterType(t)}>
                  <View className={`px-3 py-1.5 rounded-full ${active ? 'bg-blue-600' : 'bg-white dark:bg-slate-700'}`}>
                    <Text className={`text-sm ${active ? 'text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>{t}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="还没有债务"
          hint={filterType !== '全部' ? '当前类型下没有债务，试试其他筛选' : '点击右上角「新增债务」开始记录你的第一笔负债'}
          action={
            <TouchableOpacity onPress={openAdd} className="mt-4 px-5 py-3 rounded-2xl bg-blue-600">
              <Text className="text-white font-medium">+ 新增债务</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(d) => d.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <DebtFormModal
        visible={modalVisible}
        data={editing}
        onClose={() => setModalVisible(false)}
        onSave={(d) => {
          if (editing) updateDebt({ ...d, id: editing.id, createdAt: editing.createdAt });
          else addDebt(d);
        }}
      />
    </Screen>
  );
}