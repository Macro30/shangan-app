import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import dayjs from 'dayjs';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import {
  Card,
  Money,
  EmptyState,
  ProgressBar,
  IconBadge,
  PALETTE,
  chartOrder,
} from '@/components/ui';
import { DonutChart, Legend, BalanceLineChart, BarChart } from '@/components/Charts';
import { useDebts } from '@/contexts/DebtContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { simulatePayoff, simulateSingleDebt, monthsElapsed } from '@/utils/payoff';
import { r2, fmtMoney } from '@/utils/money';

const DEBT_TYPE_ICON: Record<string, string> = {
  信用卡: 'credit-card',
  网贷: 'mobile-screen',
  消费分期: 'tags',
  房贷: 'house',
  车贷: 'car',
  亲友借款: 'handshake',
  其他: 'circle-dollar',
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const { debts, payments, settings } = useDebts();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const today = dayjs();
  const monthKey = today.format('YYYY-MM');

  // 关键指标
  const totalDebt = r2(debts.reduce((s, d) => s + d.principal, 0));
  const monthDue = r2(
    debts.filter((d) => d.principal > 0.009).reduce((s, d) => s + d.minPayment, 0)
  );
  const monthPaid = r2(
    payments
      .filter((p) => dayjs(p.date).format('YYYY-MM') === monthKey)
      .reduce((s, p) => s + p.amount, 0)
  );
  // 累计利息（估算）：按各债务独立以最低还款模拟，取开始至今的利息
  let paidInterestAcc = 0;
  for (const d of debts) {
    const sim = simulateSingleDebt(d.originalPrincipal, d.annualRate, d.minPayment);
    const elapsed = monthsElapsed(d.startDate, today.toDate());
    const arr = sim.paidInterestUpToMonths;
    for (let i = 0; i < Math.min(elapsed, arr.length); i++) paidInterestAcc += arr[i];
  }
  const metrics = { totalDebt, monthDue, monthPaid, paidInterest: r2(paidInterestAcc) };

  // 余额曲线（向前看坡向）
  const minSum = debts.filter((d) => d.principal > 0.009).reduce((s, d) => s + d.minPayment, 0);
  const budget = settings.monthlyBudget > 0 ? settings.monthlyBudget : (minSum > 0 ? minSum : 0);
  const simRes = simulatePayoff(debts, budget, settings.strategy);
  const balances: number[] = [];
  const labels: string[] = [];
  let bal = r2(debts.reduce((s, d) => s + d.principal, 0));
  balances.push(bal);
  labels.push(dayjs().format('YY-MM'));
  for (const m of simRes.months) {
    bal = r2(bal - m.totalPrincipal);
    balances.push(bal);
    labels.push(m.monthLabel.slice(2));
    if (bal <= 0.009) break;
  }
  const curve = { balances, labels };

  // 占比
  const shareSegments = useMemo(
    () =>
      debts
        .filter((d) => d.principal > 0.009)
        .map((d, i) => ({
          value: d.principal,
          color: chartOrder[i % chartOrder.length],
          label: d.name,
        })),
    [debts]
  );

  // 本月还款构成（应付/已还）
  const compose = useMemo(() => {
    const due = debts
      .filter((d) => d.principal > 0.009)
      .map((d) => ({ label: d.name, value: r2(d.minPayment) }));
    return due;
  }, [debts]);

  // 本月待还清单（按还款日排序）
  const dueList = useMemo(() => {
    const dueDaySort = (a: number, b: number) => a - b;
    return debts
      .filter((d) => d.principal > 0.009)
      .sort((a, b) => dueDaySort(a.dueDay, b.dueDay));
  }, [debts]);

  const paidRatio = metrics.monthDue > 0 ? metrics.monthPaid / metrics.monthDue : 1;

  const monthSegments = useMemo(
    () => [
      { value: metrics.monthPaid, color: PALETTE.success, label: '本月已还' },
      { value: Math.max(0, metrics.monthDue - metrics.monthPaid), color: PALETTE.warning, label: '本月待还' },
    ].filter((s) => s.value > 0.009),
    [metrics]
  );

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View
          className="px-5 pt-2 pb-6"
          style={{ backgroundColor: PALETTE.primary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center gap-2">
                <FontAwesome6 name="anchor" size={15} color="#BFDBFE" />
                <Text className="text-blue-100 text-sm font-semibold tracking-wide">上岸</Text>
              </View>
              <Text className="text-slate-300 text-xs mt-2">总负债（剩余本金）</Text>
              <Text className="text-white text-3xl font-bold mt-1" style={{ fontFamily: 'Menlo' }}>
                ¥{fmtMoney(metrics.totalDebt)}
              </Text>
            </View>
            <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <FontAwesome6 name="wallet" size={22} color="#fff" />
            </View>
          </View>
          <View className="flex-row mt-4 gap-3">
            <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <Text className="text-slate-300 text-xs">本月应还</Text>
              <Text className="text-white text-lg font-semibold mt-1" style={{ fontFamily: 'Menlo' }}>¥{fmtMoney(metrics.monthDue)}</Text>
            </View>
            <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <Text className="text-slate-300 text-xs">本月已还</Text>
              <Text className="text-emerald-300 text-lg font-semibold mt-1" style={{ fontFamily: 'Menlo' }}>¥{fmtMoney(metrics.monthPaid)}</Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between mt-4">
            <Text className="text-slate-300 text-xs">本月还款进度</Text>
            <Text className="text-slate-200 text-xs" style={{ fontFamily: 'Menlo' }}>{Math.round(paidRatio * 100)}%</Text>
          </View>
          <View className="mt-2">
            <ProgressBar value={paidRatio} color="#34D399" height={8} />
          </View>
        </View>

        {/* 指标卡 */}
        <View className="px-5 mt-4 flex-row flex-wrap gap-3">
          {[
            { label: '债务笔数', value: `${debts.filter((d) => d.principal > 0.009).length} 笔`, icon: 'layer-group', color: PALETTE.accent },
            { label: '累计已还利息', value: `¥${fmtMoney(metrics.paidInterest)}`, icon: 'percent', color: PALETTE.danger },
            { label: '策略', value: settings.strategy === 'snowball' ? '雪球法' : '雪崩法', icon: 'arrows-down-to-line', color: PALETTE.success },
          ].map((m, i) => (
            <Card key={i} className="flex-1 min-w-[46%]" style={{ padding: 14 }}>
              <IconBadge icon={m.icon} color={m.color} size={36} />
              <Text className="text-slate-400 dark:text-slate-400 text-xs mt-2">{m.label}</Text>
              <Text className="text-slate-900 dark:text-white text-base font-semibold mt-1" style={{ fontFamily: 'Menlo' }}>
                {m.value}
              </Text>
            </Card>
          ))}
        </View>

        {/* 余额下降曲线 */}
        <Card className="mx-5 mt-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-white text-base font-semibold">负债余额走势</Text>
            <Text className="text-slate-400 text-xs">按当前策略估算</Text>
          </View>
          <View className="mt-3">
            <BalanceLineChart data={curve.balances} labels={curve.labels} />
          </View>
        </Card>

        {/* 占比 + 本月构成 */}
        <View className="px-5 mt-3 gap-3">
          <Card>
            <Text className="text-slate-900 dark:text-white text-base font-semibold mb-2">债务占比</Text>
            {shareSegments.length === 0 ? (
              <EmptyState icon="chart-pie" title="暂无债务数据" hint="添加债务后会在这里展示占比统计" />
            ) : (
              <View className="flex-row items-center">
                <DonutChart segments={shareSegments} size={130} strokeWidth={22} centerLabel="总负债" centerValue={`¥${fmtMoney(metrics.totalDebt)}`} />
                <View className="flex-1 ml-3">
                  {shareSegments.slice(0, 4).map((s, i) => (
                    <View key={i} className="flex-row items-center justify-between py-1">
                      <View className="flex-row items-center flex-1">
                        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
                        <Text numberOfLines={1} className="ml-2 text-slate-600 dark:text-slate-300 text-sm flex-1">{s.label}</Text>
                      </View>
                      <Text className="font-mono text-slate-800 dark:text-slate-100 text-sm ml-2">{Math.round((s.value / (metrics.totalDebt || 1)) * 100)}%</Text>
                    </View>
                  ))}
                  {shareSegments.length > 4 && (
                    <Text className="text-slate-400 text-xs mt-1">等 {shareSegments.length} 笔…</Text>
                  )}
                </View>
              </View>
            )}
          </Card>

          <Card>
            <Text className="text-slate-900 dark:text-white text-base font-semibold mb-1">本月还款构成</Text>
            <Text className="text-slate-400 dark:text-slate-500 text-xs mb-3">各笔债务的每月最低还款额</Text>
            {compose.length === 0 ? (
              <EmptyState icon="chart-column" title="暂无应还债务" />
            ) : (
              <BarChart data={compose} color={PALETTE.accent} />
            )}
            {monthSegments.length > 0 && (
              <View className="mt-3">
                <Legend segments={monthSegments} />
              </View>
            )}
          </Card>
        </View>

        {/* 本月待还清单 */}
        <View className="px-5 mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-slate-900 dark:text-white text-base font-semibold">本月待还</Text>
            <TouchableOpacity onPress={() => router.navigate('/debts')}>
              <Text className="text-blue-600 dark:text-blue-400 text-sm">全部债务 ›</Text>
            </TouchableOpacity>
          </View>
          {dueList.length === 0 ? (
            <Card>
              <EmptyState icon="calendar-check" title="暂无待还债务" hint="当前没有未结清的负债" />
            </Card>
          ) : (
            <View className="gap-2">
              {dueList.map((d, i) => {
                const paid = payments
                  .filter((p) => p.debtId === d.id && dayjs(p.date).format('YYYY-MM') === monthKey)
                  .reduce((s, p) => s + p.amount, 0);
                const due = Math.max(0, r2(d.minPayment - paid));
                const daysToDue = d.dueDay - today.date();
                return (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => router.navigate('/debt-detail', { id: d.id })}
                  >
                    <Card className="flex-row items-center" style={{ padding: 14 }}>
                      <IconBadge icon={DEBT_TYPE_ICON[d.type] || 'circle-dollar'} color={chartOrder[i % chartOrder.length]} size={40} />
                      <View className="flex-1 ml-3">
                        <Text className="text-slate-900 dark:text-white text-base font-semibold">{d.name}</Text>
                        <Text className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">
                          {d.type} · 还款日 {d.dueDay} 日
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-slate-900 dark:text-white font-mono text-sm">¥{fmtMoney(d.principal)}</Text>
                        <View className="mt-1 flex-row items-center">
                          <Text className={`text-xs font-mono ${daysToDue < 0 ? 'text-red-500' : daysToDue <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            还差 ¥{fmtMoney(due)}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}