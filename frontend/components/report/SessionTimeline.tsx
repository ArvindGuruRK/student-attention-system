"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps,
} from "recharts";

interface TimelineProps {
  data: { minute: number; avg_score: number }[];
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

export function SessionTimeline({ data }: TimelineProps) {
  const chartData = data.map((d) => ({ minute: `${d.minute}m`, score: d.avg_score }));

  if (chartData.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center">
        <p className="text-xs text-[#c8c8c8]">No timeline data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0a0a" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="minute"
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
        <ReferenceLine y={60} stroke="#d4d4d4" strokeDasharray="6 3" strokeWidth={1} />
        <ReferenceLine y={40} stroke="#a3a3a3" strokeDasharray="6 3" strokeWidth={1} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#0a0a0a"
          strokeWidth={2}
          fill="url(#scoreGrad)"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
