// 债务类型
export type DebtType =
  | '信用卡'
  | '网贷'
  | '消费分期'
  | '房贷'
  | '车贷'
  | '亲友借款'
  | '其他';

export const DEBT_TYPES: DebtType[] = [
  '信用卡',
  '网贷',
  '消费分期',
  '房贷',
  '车贷',
  '亲友借款',
  '其他',
];

// 单笔债务
export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  /** 初始本金（创建时确定，用于计算已还本金/进度） */
  originalPrincipal: number;
  /** 当前剩余本金 */
  principal: number;
  /** 年化利率（%） */
  annualRate: number;
  /** 每期最低还款额（元） */
  minPayment: number;
  /** 账单日 1-31 */
  billDay: number;
  /** 还款日 1-31 */
  dueDay: number;
  /** 起始日期 YYYY-MM-DD */
  startDate: string;
  note: string;
  /** 是否开启提醒 */
  remindEnabled: boolean;
  /** 提醒提前天数：0=当天, 1=提前一天 */
  remindDays: number;
  createdAt: string;
}

// 还款记录
export interface Payment {
  id: string;
  debtId: string;
  date: string; // YYYY-MM-DD
  amount: number; // 元
  note: string;
  createdAt: string;
}

// 全局设置
export type Strategy = 'snowball' | 'avalanche';

export interface AppSettings {
  monthlyBudget: number;
  strategy: Strategy;
}

// 月度计划中的单笔债务明细
export interface MonthDebtRow {
  debtId: string;
  name: string;
  payment: number;
  principal: number;
  interest: number;
  balanceAfter: number;
}

// 单月计划行
export interface MonthRow {
  monthIndex: number; // 从1开始
  monthLabel: string; // YYYY-MM
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  rows: MonthDebtRow[];
}

// 模拟结算结果
export interface PayoffResult {
  months: MonthRow[];
  totalInterest: number;
  totalPayment: number;
  /** 结清所需月数，unpayable 时为 0 */
  monthsToPayoff: number;
  /** 预算不足以覆盖最低还款时未 true */
  unpayable: boolean;
}