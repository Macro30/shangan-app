import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { fmtMoney } from '@/utils/money';

export interface Segment {
  value: number;
  color: string;
  label: string;
}

/** 环形图（用于债务占比 / 本月还款构成） */
export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 26,
  centerLabel,
  centerValue,
}: {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  let acc = 0;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#EEF1F6"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {total > 0 &&
            segments.map((s, i) => {
              const frac = s.value / total;
              const dash = frac * circ;
              const offset = -acc * circ;
              acc += frac;
              return (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={offset}
                  fill="none"
                  strokeLinecap="butt"
                />
              );
            })}
        </G>
        <SvgText
          x={size / 2}
          y={size / 2 - 8}
          textAnchor="middle"
          fill="#64748B"
          fontSize={11}
        >
          {centerLabel || ''}
        </SvgText>
        <SvgText
          x={size / 2}
          y={size / 2 + 12}
          textAnchor="middle"
          fill="#0F172A"
          fontSize={16}
          fontWeight="bold"
          fontFamily="Menlo"
        >
          {centerValue || ''}
        </SvgText>
      </Svg>
    </View>
  );
}

/** 图例行 */
export function Legend({ segments, format = (v:number)=>fmtMoney(v) }: { segments: Segment[]; format?: (v: number) => string }) {
  return (
    <View className="mt-2">
      {segments.map((s, i) => (
        <View key={i} className="flex-row items-center justify-between py-1">
          <View className="flex-row items-center flex-1">
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
            <Text numberOfLines={1} className="ml-2 text-slate-600 dark:text-slate-300 text-sm flex-shrink">
              {s.label}
            </Text>
          </View>
          <Text className="font-mono text-slate-800 dark:text-slate-100 text-sm ml-2">{format(s.value)}</Text>
        </View>
      ))}
    </View>
  );
}

const MONO = 'Menlo';

/** 负债余额逐月下降曲线 */
export function BalanceLineChart({
  data,
  labels,
  height = 180,
  color = '#2563EB',
}: {
  data: number[];
  labels: string[];
  height?: number;
  color?: string;
}) {
  const { width } = useWindowDimensions();
  const padL = 46;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const chartW = Math.max(width - 80, 200) - padL - padR;
  const chartH = height - padT - padB;

  if (data.length < 2) {
    return (
      <View className="items-center justify-center" style={{ height }}>
        <Text className="text-slate-400 text-sm">数据不足，需至少两个月的余额趋势</Text>
      </View>
    );
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const px = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const py = (v: number) => padT + (1 - (v - min) / range) * chartH;

  const points = data.map((v, i) => `${px(i)},${py(v)}`).join(' ');
  const areaPoints = `${padL},${padT + chartH} ${points} ${px(data.length - 1)},${padT + chartH}`;

  // 横向网格刻度
  const gridNum = 4;
  const gridLines = [];
  for (let i = 0; i <= gridNum; i++) {
    const val = min + (range * i) / gridNum;
    const y = py(val);
    gridLines.push(
      <G key={i}>
        <Line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="#E5E9F0" strokeWidth={1} />
        <SvgText x={padL - 8} y={y + 4} textAnchor="end" fill="#94A3B8" fontSize={10} fontFamily={MONO}>
          {val >= 10000 ? `${(val / 10000).toFixed(0)}w` : Math.round(val).toLocaleString()}
        </SvgText>
      </G>
    );
  }

  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <Svg width={chartW + padL + padR} height={height}>
      {gridLines}
      <Polygon points={areaPoints} fill={`${color}1a`} />
      <Path
        d={`M ${points.replace(/ /g, ' L ')}`}
        stroke={color}
        strokeWidth={2.5}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((v, i) => (
        <Circle key={i} cx={px(i)} cy={py(v)} r={3} fill="#fff" stroke={color} strokeWidth={2} />
      ))}
      {labels.map((lb, i) =>
        i % labelStep === 0 || i === data.length - 1 ? (
          <SvgText key={i} x={px(i)} y={height - 8} textAnchor="middle" fill="#94A3B8" fontSize={9}>
            {lb}
          </SvgText>
        ) : null
      )}
    </Svg>
  );
}

/** 纵向柱状图（本月各债务应付/已还构成） */
export function BarChart({
  data,
  height = 140,
  color = '#16A34A',
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const { width } = useWindowDimensions();
  const padL = 14;
  const padR = 14;
  const padB = 20;
  const chartW = Math.max(width - 80, 220) - padL - padR;
  const chartH = height - padB - 12;
  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length || 1;
  const slot = chartW / n;
  const barW = Math.min(28, slot * 0.5);

  return (
    <Svg width={chartW + padL + padR} height={height}>
      {data.map((d, i) => {
        const x = padL + slot * i + (slot - barW) / 2;
        const h = (d.value / max) * chartH;
        const y = padB + chartH - h;
        const show = d.label.length > 2 ? d.label.slice(0, 2) : d.label;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={h} rx={4} fill={color} />
            <SvgText x={x + barW / 2} y={padB - 4} textAnchor="middle" fill="#475569" fontSize={9}>
              {d.value >= 10000 ? `${(d.value / 10000).toFixed(1)}w` : d.value.toFixed(0)}
            </SvgText>
            <SvgText x={x + barW / 2} y={height - 6} textAnchor="middle" fill="#94A3B8" fontSize={9}>
              {show}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}