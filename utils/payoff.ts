import dayjs from 'dayjs';
import type { Debt, MonthRow, PayoffResult, Strategy } from '@/types';
import { r2 } from './money';

const EPS = 0.009;

function monthlyRate(annualRatePercent: number): number {
  return annualRatePercent / 100 / 12;
}

/**
 * 模拟还款计划：给定预算 + 策略，逐月分配还款，
 * 返回月度明细、总利息、结清月数。
 *
 * 规则：
 * - 每个月先保证每笔活跃债务的最低还款额（覆盖利息+少量本金）
 * - 剩余预算按策略优先给某一笔债务的本金
 * - 债务结清后其最低还款额自然释放为额外预算（雪球/雪崩效应）
 * - 预算不足以覆盖所有最低还款时标记 unpayable
 */
export function simulatePayoff(
  debts: Debt[],
  monthlyBudget: number,
  strategy: Strategy = 'avalanche'
): PayoffResult {
  const active = debts.filter((d) => d.principal > EPS);
  const months: MonthRow[] = [];
  let totalInterest = 0;
  let totalPaymentSum = 0;
  let monthsToPayoff = 0;
  let unpayable = false;

  if (active.length === 0) {
    return {
      months,
      totalInterest: 0,
      totalPayment: 0,
      monthsToPayoff: 0,
      unpayable: false,
    };
  }

  // 剩余本金
  const remaining: Record<string, number> = {};
  active.forEach((d) => (remaining[d.id] = d.principal));

  const isActive = (d: Debt) => remaining[d.id] > EPS;

  const priorityOrder = (): Debt[] => {
    const list = active.filter(isActive);
    if (strategy === 'snowball') {
      // 雪球法：余额越小越优先，余额相同利率高优先
      list.sort((a, b) =>
        remaining[a.id] - remaining[b.id] !== 0
          ? remaining[a.id] - remaining[b.id]
          : b.annualRate - a.annualRate
      );
    } else {
      // 雪崩法：利率越高越优先
      list.sort((a, b) => b.annualRate - a.annualRate);
    }
    return list;
  };

  const baseDate = active.length
    ? dayjs(Math.min(...active.map((d) => dayjs(d.startDate).valueOf())))
    : dayjs();

  for (let m = 1; m <= 720; m++) {
    const order = priorityOrder();
    if (order.length === 0) {
      monthsToPayoff = m - 1;
      break;
    }

    // 最低还款总和
    const minSum = order.reduce((s, d) => s + Math.min(d.minPayment, remaining[d.id] + remaining[d.id] * monthlyRate(d.annualRate)), 0);
    if (monthlyBudget > 0 && monthlyBudget < minSum) {
      unpayable = true;
      monthsToPayoff = 0;
      break;
    }

    let avail = monthlyBudget > 0 ? monthlyBudget : minSum;
    const rowMap: Record<string, MonthRow['rows'][number]> = {};
    let monthInterest = 0;
    let monthPrincipal = 0;
    let monthPayment = 0;

    // 阶段1：最低还款额
    for (const d of order) {
      const rate = monthlyRate(d.annualRate);
      const interest = remaining[d.id] * rate;
      totalInterest += interest;
      monthInterest += interest;
      const afford = Math.min(
        d.minPayment,
        remaining[d.id] + interest
      );
      const pay = Math.min(afford, avail);
      const intPart = Math.min(interest, pay);
      const prinPart = pay - intPart;
      remaining[d.id] -= prinPart;
      avail -= pay;
      monthPrincipal += prinPart;
      monthPayment += pay;
      rowMap[d.id] = {
        debtId: d.id,
        name: d.name,
        payment: r2(pay),
        principal: r2(prinPart),
        interest: r2(intPart),
        balanceAfter: r2(remaining[d.id]),
      };
    }

    // 阶段2：额外预算按优先顺序偿还本金
    for (const d of order) {
      if (avail <= EPS) break;
      const cap = remaining[d.id];
      if (cap <= EPS) continue;
      const extra = Math.min(avail, cap);
      avail -= extra;
      remaining[d.id] -= extra;
      monthPrincipal += extra;
      monthPayment += extra;
      const r = rowMap[d.id];
      if (r) {
        r.principal = r2(r.principal + extra);
        r.payment = r2(r.payment + extra);
        r.balanceAfter = r2(remaining[d.id]);
      }
    }

    totalPaymentSum += monthPayment;
    months.push({
      monthIndex: m,
      monthLabel: baseDate.add(m - 1, 'month').format('YYYY-MM'),
      totalPayment: r2(monthPayment),
      totalPrincipal: r2(monthPrincipal),
      totalInterest: r2(monthInterest),
      rows: order.map((d) => rowMap[d.id]),
    });
  }

  if (monthsToPayoff === 0 && !unpayable) {
    // 达到最大月数仍未结清
    const order = priorityOrder();
    monthsToPayoff = order.length > 0 ? 0 : months.length;
  }

  return {
    months,
    totalInterest: r2(totalInterest),
    totalPayment: r2(totalPaymentSum),
    monthsToPayoff,
    unpayable,
  };
}

/** 单笔债务单独模拟（用于详情页利息估算） */
export interface SingleSimResult {
  totalInterest: number;
  months: number;
  paidInterestUpToMonths: number[];
}

/**
 * 以「每月最低还款额」为固定月供，模拟单笔债务的结清过程。
 * 返回总利息与逐月利息数组（用于估算已付/剩余利息）。
 */
export function simulateSingleDebt(
  principal: number,
  annualRate: number,
  monthlyPayment: number
): SingleSimResult {
  let remaining = principal;
  let totalInterest = 0;
  const paidInterest: number[] = [];
  const pay = Math.max(monthlyPayment, 0.01);
  for (let m = 1; m <= 720; m++) {
    if (remaining <= EPS) break;
    const interest = remaining * monthlyRate(annualRate);
    totalInterest += interest;
    paidInterest.push(r2(interest));
    const afford = Math.min(pay, remaining + interest);
    const prinPart = afford - interest;
    remaining -= prinPart;
  }
  return {
    totalInterest: r2(totalInterest),
    months: paidInterest.length,
    paidInterestUpToMonths: paidInterest,
  };
}

/** 从开始日期到当前经过的月数（含当月按 0 起） */
export function monthsElapsed(startDate: string, now = new Date()): number {
  const start = dayjs(startDate);
  if (!start.isValid()) return 0;
  const end = dayjs(now);
  return Math.max(0, end.diff(start.startOf('month'), 'month') + 1);
}