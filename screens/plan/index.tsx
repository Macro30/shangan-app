import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Money, EmptyState, Segmented, PALETTE, chartOrder } from '@/components/ui';
import { useDebts } from '@/contexts/DebtContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { simulatePayoff } from '@/utils/payoff';
import { fmtMoney } from '@/utils/money';
import type { Strategy } from '@/types';

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { debts, settings, updateSettings } = useDebts();
  const [budgetText, setBudgetText] = useState(
    settings.monthlyBudget > 0 ? String(settings.monthlyBudget) : ''
  );
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [showAll, setShowAll] = useState(false);

  const activeDebts = useMemo(() => debts.filter((d) => d.principal > 0.009), [debts]);

  const result = useMemo(() => {
    return simulatePayoff(debts, settings.monthlyBudget, settings.strategy);
  }, [debts, settings.monthlyBudget, settings.strategy]);

  // 分配建议顺序
  const priority = useMemo(() => {
    const list = [...activeDebts];
    if (settings.strategy === 'snowball') {
      list.sort((a, b) => a.principal - b.principal || b.annualRate - a.annualRate);
    } else {
      list.sort((a, b) => b.annualRate - a.annualRate);
    }
    return list;
  }, [activeDebts, settings.strategy]);

  const saveBudget = (text: string) => {
    setBudgetText(text);
    const n = parseFloat(text.replace(/[^\d.]/g, ''));
    updateSettings({ monthlyBudget: Number.isNaN(n) || n <= 0 ? 0 : Math.round(n * 100) / 100 });
  };

  const payoffDate = useMemo(() => {
    if (!result.monthsToPayoff) return null;
    return dayjs().add(result.monthsToPayoff, 'month').format('YYYY年M月');
  }, [result.monthsToPayoff]);

  const visibleMonths = showAll ? result.months : result.months.slice(0, 24);

  const toggleMonth = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-slate-900 dark:text-white text-2xl font-bold">还款计划</Text>
        <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1">按你设定的策略自动生成逐月还款方案</Text>

        {/* 策略切换 */}
        <Card className="mt-4">
          <Text className="text-slate-900 dark:text-white text-base font-semibold mb-2">还款策略</Text>
          <Segmented<Strategy>
            value={settings.strategy}
            onChange={(v) => updateSettings({ strategy: v })}
            options={[
              { label: '雪球法', value: 'snowball' },
              { label: '雪崩法', value: 'avalanche' },
            ]}
          />
          <Text className="text-slate-400 dark:text-slate-500 text-xs mt-2 leading-4">
            {settings.strategy === 'snowball'
              ? '雪球法：优先清偿余额最小的债务，获得"还清一笔"的正反馈。'
              : '雪崩法：优先偿还利率最高的债务，总利息支出更少。'}
          </Text>

          {/* 月度预算 */}
          <View className="mt-3 flex-row items-center rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
            <View className="flex-1">
              <Text className="text-slate-700 dark:text-slate-200 text-sm font-medium">每月还款预算</Text>
              <Text className="text-slate-400 text-xs mt-0.5">预算不足时提示无法结清</Text>
            </View>
            <TextInput
              value={budgetText}
              onChangeText={saveBudget}
              placeholder="不设限"
              keyboardType="decimal-pad"
              placeholderTextColor="#94A3B8"
              className="w-28 bg-white dark:bg-slate-700 rounded-xl px-3 py-2 text-right text-slate-900 dark:text-white font-mono text-base"
            />
          </View>
        </Card>

        {/* 关键结果 */}
        {activeDebts.length === 0 ? (
          <Card className="mt-4">
            <EmptyState icon="calendar-week" title="暂无债务" hint="先到「债务」页添加负债，才能生成还款计划" />
          </Card>
        ) : (
          <>
            <View className="flex-row gap-3 mt-4">
              {result.unpayable ? (
                <Card className="flex-1" style={{ padding: 16, backgroundColor: '#FEF2F2' }}>
                  <Text className="text-red-500 text-sm font-semibold">预算不足，无法结清</Text>
                  <Text className="text-red-400 text-xs mt-1 leading-4">
                    每月预算需至少覆盖所有债务的最低还款额合计{' '}
                    <Text className="font-mono">¥{fmtMoney(activeDebts.reduce((s, d) => s + d.minPayment, 0))}</Text>
                  </Text>
                </Card>
              ) : (
                <Card className="flex-1 items-center" style={{ padding: 16, backgroundColor: '#0F172A' }}>
                  <Text className="text-slate-400 text-xs">预计全部结清</Text>
                  <Text className="text-white text-xl font-bold mt-1" style={{ fontFamily: 'Menlo' }}>
                    {payoffDate || '—'}
                  </Text>
                  <Text className="text-slate-400 text-xs mt-1">{result.monthsToPayoff} 个月</Text>
                </Card>
              )}
            </View>

            <View className="flex-row gap-3 mt-3">
              <Card className="flex-1" style={{ padding: 14 }}>
                <Text className="text-slate-400 text-xs">预计总利息</Text>
                <Money value={result.totalInterest} className="text-rose-600 dark:text-rose-400 text-lg font-bold mt-1" />
              </Card>
              <Card className="flex-1" style={{ padding: 14 }}>
                <Text className="text-slate-400 text-xs">首月应还总额</Text>
                <Money value={result.months[0]?.totalPayment || 0} className="text-slate-900 dark:text-white text-lg font-bold mt-1" />
              </Card>
            </View>
          </>
        )}

        {/* 分配建议 */}
        {priority.length > 0 && (
          <Card className="mt-4">
            <Text className="text-slate-900 dark:text-white text-base font-semibold mb-2">
              建议还款顺序（{settings.strategy === 'snowball' ? '余额优先' : '利率优先'}）
            </Text>
            {priority.map((d, i) => (
              <TouchableOpacity
                key={d.id}
                onPress={() => router.navigate('/debt-detail', { id: d.id })}
                className="flex-row items-center py-2"
              >
                <View
                  className="h-7 w-7 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${chartOrder[i % chartOrder.length]}1a` }}
                >
                  <Text className="text-sm font-bold" style={{ color: chartOrder[i % chartOrder.length], fontFamily: 'Menlo' }}>
                    {i + 1}
                  </Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-slate-800 dark:text-slate-100 text-sm font-medium">{d.name}</Text>
                  <Text className="text-slate-400 text-xs">{d.annualRate}% 年化</Text>
                </View>
                <Money value={d.principal} className="text-slate-700 dark:text-slate-200 text-sm" />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* 月度计划表 */}
        {result.months.length > 0 && (
          <View className="mt-4">
            <Text className="text-slate-900 dark:text-white text-base font-semibold mb-2">按月还款计划</Text>
            {visibleMonths.map((m) => {
              const open = expanded.has(m.monthIndex);
              return (
                <Card key={m.monthIndex} className="mb-2" style={{ padding: 0, overflow: 'hidden' }}>
                  <TouchableOpacity onPress={() => toggleMonth(m.monthIndex)} className="flex-row items-center px-4 py-3">
                    <View className="flex-1">
                      <Text className="text-slate-800 dark:text-slate-100 text-sm font-semibold">{m.monthLabel}  <Text className="text-slate-400 font-normal">第{m.monthIndex}期</Text></Text>
                    </View>
                    <View className="flex-row items-center gap-4">
                      <Text className="text-slate-500 text-xs">
                        <Text className="font-mono">本 {fmtMoney(m.totalPrincipal)}</Text>
                      </Text>
                      <Text className="text-rose-500 text-xs">
                        <Text className="font-mono">息 {fmtMoney(m.totalInterest)}</Text>
                      </Text>
                      <FontAwesome6 name={open ? 'chevron-up' : 'chevron-down'} size={12} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                  {open && (
                    <View className="border-t border-slate-100 dark:border-slate-800 px-4 py-1">
                      <View className="flex-row py-2">
                        <Text className="flex-1 text-slate-400 text-xs">债务</Text>
                        <Text className="w-16 text-right text-slate-400 text-xs">本金</Text>
                        <Text className="w-16 text-right text-slate-400 text-xs">利息</Text>
                        <Text className="w-20 text-right text-slate-400 text-xs">应还</Text>
                      </View>
                      {m.rows.map((r, ri) => (
                        <View key={ri} className="flex-row py-1.5">
                          <Text numberOfLines={1} className="flex-1 text-slate-700 dark:text-slate-200 text-sm">{r.name}</Text>
                          <Text className="w-16 text-right font-mono text-slate-700 dark:text-slate-200 text-sm">{fmtMoney(r.principal)}</Text>
                          <Text className="w-16 text-right font-mono text-rose-600 dark:text-rose-400 text-sm">{fmtMoney(r.interest)}</Text>
                          <Text className="w-20 text-right font-mono text-blue-600 dark:text-blue-400 text-sm">{fmtMoney(r.payment)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })}
            {!showAll && result.months.length > 24 && (
              <TouchableOpacity
                onPress={() => setShowAll(true)}
                className="py-3 items-center rounded-2xl bg-slate-100 dark:bg-slate-800 mt-1"
              >
                <Text className="text-slate-600 dark:text-slate-300 text-sm">展开全部 {result.months.length} 期</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}