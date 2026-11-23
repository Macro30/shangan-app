import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
import dayjs from 'dayjs';
import Toast from 'react-native-toast-message';
import { SmartDateInput } from '@/components/SmartDateInput';
import { Segmented } from '@/components/ui';
import { DEBT_TYPES, type Debt, type DebtType } from '@/types';
import { PALETTE } from '@/components/ui';

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text className="text-slate-600 dark:text-slate-300 text-sm mb-1.5 mt-3">
      {text}
      {required && <Text className="text-red-500"> *</Text>}
    </Text>
  );
}

function MoneyInput({
  value,
  onChange,
  placeholder,
  keyboardType = 'decimal-pad',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'decimal-pad' | 'number-pad';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      keyboardType={keyboardType}
      className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-base"
      placeholderTextColor="#94A3B8"
    />
  );
}

interface Props {
  visible: boolean;
  /** 编辑时传入原数据，否则为新增 */
  data: Debt | null;
  onClose: () => void;
  onSave: (d: Omit<Debt, 'id' | 'createdAt'>) => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => `${i + 1}`);

export default function DebtFormModal({ visible, data, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<DebtType>('信用卡');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [billDay, setBillDay] = useState('5');
  const [dueDay, setDueDay] = useState('10');
  const [startDate, setStartDate] = useState<string | null>(dayjs().format('YYYY-MM-DD'));
  const [note, setNote] = useState('');
  const [remindEnabled, setRemindEnabled] = useState(true);
  const [remindDays, setRemindDays] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 受控弹窗每次打开/切换编辑对象时同步表单（一次性写入，非持续订阅）
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (visible) {
      setName(data?.name ?? '');
      setType(data?.type ?? '信用卡');
      setPrincipal(data ? String(data.principal) : '');
      setRate(data ? String(data.annualRate) : '');
      setMinPayment(data ? String(data.minPayment) : '');
      setBillDay(data ? String(data.billDay) : '5');
      setDueDay(data ? String(data.dueDay) : '10');
      setStartDate(data?.startDate || dayjs().format('YYYY-MM-DD'));
      setNote(data?.note ?? '');
      setRemindEnabled(data?.remindEnabled ?? true);
      setRemindDays(data?.remindDays ?? 0);
      setErrors({});
    }
  }, [visible, data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = '请输入债务名称';
    const p = parseFloat(principal);
    if (!principal.trim() || isNaN(p) || p <= 0) e.principal = '剩余本金必须为正数';
    const mp = parseFloat(minPayment);
    if (!minPayment.trim() || isNaN(mp) || mp < 0) e.minPayment = '最低还款额不能为负';
    const r = parseFloat(rate);
    if (!rate.trim() || isNaN(r) || r < 0 || r > 100) e.rate = '利率需在 0-100 之间';
    const b = parseInt(billDay, 10);
    if (isNaN(b) || b < 1 || b > 31) e.billDay = '账单日需在 1-31';
    const du = parseInt(dueDay, 10);
    if (isNaN(du) || du < 1 || du > 31) e.dueDay = '还款日需在 1-31';
    if (!startDate || !dayjs(startDate).isValid()) e.startDate = '请选择起始日期';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const mp = parseFloat(minPayment);
    onSave({
      name: name.trim(),
      type,
      originalPrincipal: data ? (data.originalPrincipal || p) : p,
      principal: Math.round(p * 100) / 100,
      annualRate: Math.round(r * 100) / 100,
      minPayment: Math.round(mp * 100) / 100,
      billDay: parseInt(billDay, 10),
      dueDay: parseInt(dueDay, 10),
      startDate: startDate || dayjs().format('YYYY-MM-DD'),
      note: note.trim(),
      remindEnabled,
      remindDays,
    });
    setErrors({});
    Toast.show({ type: 'success', text1: data ? '已保存' : '已添加债务' });
    onClose();
  };

  const renderDayPicker = (label: string, value: string, onChange: (v: string) => void, err?: string) => (
    <View className="flex-1">
      <Label text={label} required />
      <View className="flex-row bg-slate-100 dark:bg-slate-800 rounded-xl px-2 py-1">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
          {DAYS.map((d) => {
            const active = value === d;
            return (
              <TouchableOpacity key={d} onPress={() => onChange(d)}>
                <View
                  className={`px-3 py-2 rounded-lg mx-0.5 ${active ? 'bg-blue-600' : ''}`}
                >
                  <Text className={`text-sm ${active ? 'text-white font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>{d}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {!!err && <Text className="text-red-500 text-xs mt-1">{err}</Text>}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white dark:bg-slate-900 rounded-t-3xl" style={{ paddingBottom: Platform.OS === 'ios' ? 30 : 16 }}>
              <View className="items-center pt-3 pb-1">
                <View className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
              </View>
              <View className="flex-row items-center justify-between px-5 pt-2">
                <Text className="text-slate-900 dark:text-white text-lg font-bold">
                  {data ? '编辑债务' : '新增债务'}
                </Text>
                <TouchableOpacity onPress={onClose} className="h-8 w-8 items-center justify-center">
                  <Text className="text-slate-400 text-xl">✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                className="px-5"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Label text="债务名称" required />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="如：招行信用卡、京东白条"
                  placeholderTextColor="#94A3B8"
                  className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-base"
                />
                {!!errors.name && <Text className="text-red-500 text-xs mt-1">{errors.name}</Text>}

                <Label text="债务类型" required />
                <View className="flex-row flex-wrap gap-2">
                  {DEBT_TYPES.map((t) => {
                    const active = type === t;
                    return (
                      <Pressable key={t} onPress={() => setType(t)}>
                        <View
                          className={`px-3 py-2 rounded-full ${active ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}
                        >
                          <Text className={`text-sm ${active ? 'text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>{t}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Label text="当前剩余本金（元）" required />
                <MoneyInput value={principal} onChange={setPrincipal} placeholder="20000" />
                {!!errors.principal && <Text className="text-red-500 text-xs mt-1">{errors.principal}</Text>}

                <Label text="年化利率（%）" required />
                <MoneyInput value={rate} onChange={setRate} placeholder="12.5（0-100）" />
                {!!errors.rate && <Text className="text-red-500 text-xs mt-1">{errors.rate}</Text>}

                <Label text="每期最低还款额（元）" required />
                <MoneyInput value={minPayment} onChange={setMinPayment} placeholder="1000" />
                {!!errors.minPayment && <Text className="text-red-500 text-xs mt-1">{errors.minPayment}</Text>}

                <View className="flex-row gap-3">
                  {renderDayPicker('账单日', billDay, setBillDay, errors.billDay)}
                  {renderDayPicker('还款日', dueDay, setDueDay, errors.dueDay)}
                </View>

                <Label text="起始日期" required />
                <SmartDateInput
                  value={startDate ? dayjs(startDate).toISOString() : null}
                  onChange={(iso) => setStartDate(dayjs(iso).format('YYYY-MM-DD'))}
                  displayFormat="YYYY-MM-DD"
                  containerStyle={{ borderRadius: 12 }}
                />
                {!!errors.startDate && <Text className="text-red-500 text-xs mt-1">{errors.startDate}</Text>}

                <Label text="备注" />
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="选填，如分期期数、联系人等"
                  placeholderTextColor="#94A3B8"
                  multiline
                  className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-base min-h-[72px]"
                />

                <View className="flex-row items-center justify-between mt-4 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                  <View style={{ flex: 2 }}>
                    <Text className="text-slate-900 dark:text-white text-sm font-medium">还款日提醒</Text>
                    <Text className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">
                      还款日{remindDays === 0 ? '当天' : '前 1 天'}通知
                    </Text>
                  </View>
                  <View style={{ flex: 1.6 }}>
                    <Segmented<0 | 1>
                      value={remindDays as 0 | 1}
                      onChange={(v) => setRemindDays(v)}
                      options={[{ label: '当天', value: 0 }, { label: '提前1天', value: 1 }]}
                    />
                  </View>
                  <Switch
                    value={remindEnabled}
                    onValueChange={setRemindEnabled}
                    trackColor={{ false: '#CBD5E1', true: `${PALETTE.accent}99` }}
                    thumbColor={remindEnabled ? PALETTE.accent : '#F1F5F9'}
                    disabled={remindDays === 0} // 保留可开关
                  />
                </View>
              </ScrollView>

              <View className="flex-row gap-3 px-5 pt-4">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 items-center"
                >
                  <Text className="text-slate-600 dark:text-slate-300 text-base font-medium">取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submit}
                  className="flex-1 py-3 rounded-xl bg-blue-600 items-center"
                >
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