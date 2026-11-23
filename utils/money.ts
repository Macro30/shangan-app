// 金额工具：统一以「元」为单位，保留两位小数

/** 四舍五入到 2 位小数，避免浮点误差 */
export function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** 格式化为带千分位、两位小数的金额字符串 */
export function fmtMoney(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 等宽字体（金额突出显示） */
export const MONO_FONT = 'Menlo';

/** 解析用户输入为安全的非负数（元），非法返回 0 */
export function parseMoney(input: string): number {
  const t = String(input).trim().replace(/[^\d.]/g, '');
  const n = parseFloat(t);
  return isNaN(n) || n < 0 ? 0 : r2(n);
}

/** 利率 0-100 */
export function parseRate(input: string): number {
  const t = String(input).trim().replace(/[^\d.]/g, '');
  const n = parseFloat(t);
  if (isNaN(n)) return 0;
  return Math.min(Math.max(n, 0), 100);
}