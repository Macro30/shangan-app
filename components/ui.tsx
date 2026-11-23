import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { fmtMoney, MONO_FONT } from '@/utils/money';

/** 主题色（配合 tailwind 明暗自适应） */
export const PALETTE = {
  primary: '#0F172A',
  accent: '#2563EB',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#0EA5E9',
};

const chartOrder = [
  '#2563EB',
  '#F59E0B',
  '#16A34A',
  '#EF4444',
  '#8B5CF6',
  '#0EA5E9',
  '#EC4899',
];

export { chartOrder };

/** 金额文本（等宽突出） */
export function Money({
  value,
  className = '',
  signed = false,
  style,
}: {
  value: number;
  className?: string;
  signed?: boolean;
  style?: object;
}) {
  const prefix = signed ? (value >= 0 ? '+' : '-') : '';
  return (
    <Text className={className} style={[{ fontFamily: MONO_FONT }, style]}>
      {prefix}
      {fmtMoney(Math.abs(value))}
    </Text>
  );
}

/** 卡片容器 */
export function Card({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: object;
}) {
  return (
    <View
      className={`rounded-2xl bg-white dark:bg-slate-900 p-4 ${className}`}
      style={[{ shadowColor: '#64748B', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, style]}
    >
      {children}
    </View>
  );
}

/** 空状态 */
export function EmptyState({
  icon = 'inbox',
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="items-center justify-center py-16 px-8">
      <View className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
        <FontAwesome6 name={icon} size={26} color="#94A3B8" />
      </View>
      <Text className="text-slate-700 dark:text-slate-200 text-base font-semibold text-center">
        {title}
      </Text>
      {!!hint && (
        <Text className="text-slate-400 dark:text-slate-500 text-sm text-center mt-2 leading-5">
          {hint}
        </Text>
      )}
      {action}
    </View>
  );
}

/** 分段选择器 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`flex-1 py-2 rounded-lg items-center ${active ? 'bg-white dark:bg-slate-600' : ''}`}
            style={active ? { shadowColor: '#64748B', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } } : undefined}
          >
            <Text className={`text-sm font-medium ${active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** 进度条 */
export function ProgressBar({ value, color, height = 10 }: { value: number; color?: string; height?: number }) {
  const v = Math.min(Math.max(value, 0), 1);
  return (
    <View className="bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"
      style={{ height, width: '100%' }}>
      <View
        style={{
          height: '100%',
          width: `${v * 100}%`,
          backgroundColor: color || PALETTE.accent,
          borderRadius: height,
        }}
      />
    </View>
  );
}

/** 图标块 */
export function IconBadge({
  icon,
  color = '#2563EB',
  bg,
  size = 40,
}: {
  icon: string;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <View
      className="items-center justify-center rounded-xl"
      style={{ width: size, height: size, backgroundColor: bg || `${color}18` }}
    >
      <FontAwesome6 name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

/** 一行标签 + 值 */
export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-slate-500 dark:text-slate-400 text-sm">{label}</Text>
      <View className="flex-row items-center">{children}</View>
    </View>
  );
}

/** 通用分段按钮（带主题色激活） */
export function PillButton({
  active,
  onPress,
  children,
  color = PALETTE.accent,
}: {
  active?: boolean;
  onPress: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full border ${active ? '' : 'border-slate-200 dark:border-slate-700'}`}
      style={active ? { backgroundColor: `${color}1a`, borderColor: color } : undefined}
    >
      {children}
    </Pressable>
  );
}

export { useColorScheme };