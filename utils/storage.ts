import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, Debt, Payment } from '@/types';

const KEYS = {
  debts: 'debtdb:debts',
  payments: 'debtdb:payments',
  settings: 'debtdb:settings',
};

export const DEFAULT_SETTINGS: AppSettings = {
  monthlyBudget: 0,
  strategy: 'avalanche',
};

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function write<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 忽略写入失败（本地存储）
  }
}

export const storage = {
  loadDebts: () => read<Debt[]>(KEYS.debts, []),
  saveDebts: (d: Debt[]) => write(KEYS.debts, d),
  loadPayments: () => read<Payment[]>(KEYS.payments, []),
  savePayments: (p: Payment[]) => write(KEYS.payments, p),
  loadSettings: () => read<AppSettings>(KEYS.settings, DEFAULT_SETTINGS),
  saveSettings: (s: AppSettings) => write(KEYS.settings, s),
  KEYS,
};

// 完整备份结构（用于导入导出）
export interface BackupData {
  app: 'debt-manager';
  version: number;
  exportedAt: string;
  debts: Debt[];
  payments: Payment[];
  settings: AppSettings;
}

export async function buildBackup(
  debts: Debt[],
  payments: Payment[],
  settings: AppSettings
): Promise<BackupData> {
  return {
    app: 'debt-manager',
    version: 1,
    exportedAt: new Date().toISOString(),
    debts,
    payments,
    settings,
  };
}

export function isValidBackup(json: unknown): json is BackupData {
  if (!json || typeof json !== 'object') return false;
  const b = json as Record<string, unknown>;
  return (
    b.app === 'debt-manager' &&
    Array.isArray(b.debts) &&
    Array.isArray(b.payments) &&
    !!b.settings
  );
}

export type { AppSettings, Debt, Payment };