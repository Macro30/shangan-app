import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import dayjs from 'dayjs';
import Toast from 'react-native-toast-message';
import { SmartDateInput } from '@/components/SmartDateInput';
import { useDebts } from '@/contexts/DebtContext';
import type { Debt, Payment } from '@/types';

interface Props {
  visible: boolean;
  data: Payment | null;
  onClose: () => void;
  onSave: (p: Omit<Payment, 'id' | 'createdAt'>) => void;
}

export default function PaymentFormModal({ visible, data, onClose, onSave }: Props) {
  const { debts } = useDebts();
  const activeDebts = debts.filter((d) => d.principal > 0.009);
  const [debtId, setDebtId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<string | null>(dayjs().format('YYYY-MM-DD'));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setDebtId(data?.debtId ?? activeDebts[0]?.id ?? '');
      setAmount(data ? String(data.amount) : '');
      setDate(data?.date || dayjs().format('YYYY-MM-DD'));
      setNote(data?.note ?? '');
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, data]);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!debtId) e.debtId = '请选择债务';
    const a = parseFloat(amount);
    if (!amount.trim() || isNaN(a) || a <= 0) e.amount = '金额必须为正数';
    if (!date || !dayjs(date).isValid()) e.date = '请选择日期';
    setErrors(e);
    if (Object.keys(e).length) return;
    const target = debts.find((d) => d.id === debtId);
    if (!target) {
      Toast.show({ type: 'error', text1: '债务不存在' });
      return;
    }
    if (a > target.principal + 0.009) {
      Toast.show({
        type: 'error',
        text1: '还款额超过剩余本金',
        text2: `${target.name} 剩余本金 ¥${target.principal.toFixed(2)}`,
      });
      return;
    }
    onSave({
      debtId,
      date: date || dayjs().format('YYYY-MM-DD'),
      amount: Math.round(a * 100) / 100,
      note: note.trim(),
    });
    setErrors({});
    Toast.show({ type: 'success', text1: data ? '已修改记录' : '已记一笔还款' });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-5" style={{ paddingBottom: Platform.OS === 'ios' ? 30 : 16 }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-slate-900 dark:text-white text-lg font-bold">
                  {data ? '修改还款记录' : '新增还款记录'}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Text className="text-slate-400 text-xl">✕</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-slate-600 dark:text-slate-300 text-sm mb-1.5">对应债务</Text>
              <View className="mb-3">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {activeDebts.map((d: Debt) => {
                  const active = debtId === d.id;
                  return (
                    <TouchableOpacity key={d.id} onPress={() => setDebtId(d.id)} className="mr-2">
                      <View className={`px-3 py-2 rounded-full ${active ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Text className={`text-sm ${active ? 'text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>{d.name}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              </View>
              {!!errors.debtId && <Text className="text-red-500 text-xs">{errors.debtId}</Text>}

              <Text className="text-slate-600 dark:text-slate-300 text-sm mb-1.5">还款金额（元）</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#94A3B8"
                className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-base font-mono"
              />
              {!!errors.amount && <Text className="text-red-500 text-xs mt-1">{errors.amount}</Text>}

              <Text className="text-slate-600 dark:text-slate-300 text-sm mb-1.5 mt-3">还款日期</Text>
              <SmartDateInput
                value={date ? dayjs(date).toISOString() : null}
                onChange={(iso) => setDate(dayjs(iso).format('YYYY-MM-DD'))}
                displayFormat="YYYY-MM-DD"
              />
              {!!errors.date && <Text className="text-red-500 text-xs mt-1">{errors.date}</Text>}

              <Text className="text-slate-600 dark:text-slate-300 text-sm mb-1.5 mt-3">备注</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="选填，如本期还款、提前还部分等"
                placeholderTextColor="#94A3B8"
                className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-base"
              />

              <View className="flex-row gap-3 mt-5">
                <TouchableOpacity onPress={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 items-center">
                  <Text className="text-slate-600 dark:text-slate-300 text-base font-medium">取消</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={submit} className="flex-1 py-3 rounded-xl bg-blue-600 items-center">
                  <Text className="text-white text-base font-medium">保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}