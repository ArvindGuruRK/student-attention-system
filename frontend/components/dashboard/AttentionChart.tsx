"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps,
} from "recharts";

interface DataPoint {
  time: string;
  avg: number;
}

interface AttentionChartProps {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0a] text-white text-xs px-3 py-2 rounded-xl shadow-lg font-[inherit]">
      <p className="text-white/50 mb-0.5">{label}</p>
      <p className="font-bold text-base tabular-nums">{payload[0].value}%</p>
    </div>
  );
}

export function AttentionChart({ data }: AttentionChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <p className="text-xs text-[#c8c8c8]">No data yet — chart updates every 5 seconds</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "#c8c8c8", fontFamily: "var(--font-poppins)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "#c8c8c8", fontFamily: "var(--font-poppins)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e5e5e5", strokeWidth: 1 }} />
        <ReferenceLine
          y={60}
          stroke="#d4d4d4"
          strokeDasharray="6 3"
          strokeWidth={1}
        />
        <ReferenceLine
          y={40}
          stroke="#a3a3a3"
          strokeDasharray="6 3"
          strokeWidth={1}
        />
        <Line
          type="monotone"
          dataKey="avg"
          stroke="#0a0a0a"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
