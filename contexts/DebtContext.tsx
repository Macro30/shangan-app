import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Crypto from 'expo-crypto';
import type { AppSettings, Debt, Payment } from '@/types';
import {
  DEFAULT_SETTINGS,
  storage,
} from '@/utils/storage';
import { r2 } from '@/utils/money';
import { scheduleAllReminders } from '@/utils/notifications';

interface DebtContextType {
  debts: Debt[];
  payments: Payment[];
  settings: AppSettings;
  isLoading: boolean;
  addDebt: (d: Omit<Debt, 'id' | 'createdAt'>) => void;
  updateDebt: (d: Debt) => void;
  deleteDebt: (id: string) => void;
  addPayment: (p: Omit<Payment, 'id' | 'createdAt'>) => void;
  updatePayment: (p: Payment) => void;
  deletePayment: (id: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  restoreAll: (debts: Debt[], payments: Payment[], settings: AppSettings) => void;
}

const DebtContext = createContext<DebtContextType | undefined>(undefined);

export const DebtProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const debtsRef = useRef<Debt[]>([]);
  debtsRef.current = debts;

  // 首次加载
  useEffect(() => {
    (async () => {
      const [d, p, s] = await Promise.all([
        storage.loadDebts(),
        storage.loadPayments(),
        storage.loadSettings(),
      ]);
      setDebts(d);
      setPayments(
        p.sort((a, b) => (a.date < b.date ? 1 : -1))
      );
      setSettings(s);
      setIsLoading(false);
    })();
  }, []);

  const persistDebts = (next: Debt[]) => {
    setDebts(next);
    storage.saveDebts(next);
  };
  const persistPayments = (next: Payment[]) => {
    const sorted = [...next].sort((a, b) => (a.date < b.date ? 1 : -1));
    setPayments(sorted);
    storage.savePayments(sorted);
  };
  const persistSettings = (next: AppSettings) => {
    setSettings(next);
    storage.saveSettings(next);
  };

  // 债务/设置变化后重排提醒
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      scheduleAllReminders(debtsRef.current.filter((x) => x.remindEnabled));
    }, 400);
    return () => clearTimeout(timer);
  }, [debts, settings, isLoading]);

  const addDebt: DebtContextType['addDebt'] = (d) => {
    const debt: Debt = {
      ...d,
      id: Crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    persistDebts([...debts, debt]);
  };

  const updateDebt: DebtContextType['updateDebt'] = (debt) => {
    const orig = debts.find((x) => x.id === debt.id);
    const originalPrincipal =
      orig && orig.originalPrincipal ? orig.originalPrincipal : debt.principal;
    persistDebts(
      debts.map((x) =>
        x.id === debt.id
          ? { ...debt, originalPrincipal: Math.max(originalPrincipal, debt.principal) }
          : x
      )
    );
  };

  const deleteDebt: DebtContextType['deleteDebt'] = (id) => {
    persistDebts(debts.filter((x) => x.id !== id));
    persistPayments(payments.filter((p) => p.debtId !== id));
  };

  const addPayment: DebtContextType['addPayment'] = (p) => {
    const rec: Payment = { ...p, id: Crypto.randomUUID(), createdAt: new Date().toISOString() };
    persistPayments([...payments, rec]);
    // 扣减对应债务剩余本金
    persistDebts(
      debts.map((d) =>
        d.id === p.debtId
          ? { ...d, principal: r2(Math.max(0, d.principal - p.amount)) }
          : d
      )
    );
  };

  const updatePayment: DebtContextType['updatePayment'] = (rec) => {
    const old = payments.find((x) => x.id === rec.id);
    persistPayments(payments.map((x) => (x.id === rec.id ? rec : x)));
    if (old) {
      const diff = old.amount - rec.amount; // >0 表示减少还款，需补回本金
      if (diff !== 0) {
        persistDebts(
          debts.map((d) =>
            d.id === rec.debtId
              ? { ...d, principal: r2(Math.max(0, d.principal + diff)) }
              : d
          )
        );
      }
    }
  };

  const deletePayment: DebtContextType['deletePayment'] = (id) => {
    const rec = payments.find((x) => x.id === id);
    persistPayments(payments.filter((x) => x.id !== id));
    if (rec) {
      persistDebts(
        debts.map((d) =>
          d.id === rec.debtId
            ? { ...d, principal: r2(d.principal + rec.amount) }
            : d
        )
      );
    }
  };

  const updateSettings: DebtContextType['updateSettings'] = (s) => {
    persistSettings({ ...settings, ...s });
  };

  const restoreAll: DebtContextType['restoreAll'] = (ds, ps, st) => {
    persistDebts(ds);
    persistPayments(ps);
    persistSettings(st);
  };

  const value = useMemo<DebtContextType>(
    () => ({
      debts,
      payments,
      settings,
      isLoading,
      addDebt,
      updateDebt,
      deleteDebt,
      addPayment,
      updatePayment,
      deletePayment,
      updateSettings,
      restoreAll,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debts, payments, settings, isLoading]
  );

  return <DebtContext.Provider value={value}>{children}</DebtContext.Provider>;
};

export function useDebts(): DebtContextType {
  const ctx = useContext(DebtContext);
  if (!ctx) throw new Error('useDebts must be used within DebtProvider');
  return ctx;
}