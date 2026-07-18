"use client";

import { Card } from "@/components/ui/Card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ChevronDown } from "lucide-react";

const data = [
  { name: 'May 8', viewers: 16000 },
  { name: 'May 9', viewers: 22000 },
  { name: 'May 10', viewers: 20000 },
  { name: 'May 11', viewers: 32400 },
  { name: 'May 12', viewers: 28000 },
  { name: 'May 13', viewers: 25000 },
  { name: 'May 14', viewers: 36000 },
];

export function LiveTrend() {
  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 p-5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold flex items-center">
          Live Trend <span className="text-text-muted font-normal text-xs ml-2">(7 Days)</span>
        </h3>
        <button className="text-xs text-text-muted hover:text-white flex items-center transition-colors bg-white/5 px-2 py-1 rounded-md border border-white/5">
          7 Days <ChevronDown className="w-3 h-3 ml-1" />
        </button>
      </div>

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value / 1000}K`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2230', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="viewers"
              stroke="#FF0050"
              strokeWidth={2}
              dot={{ fill: '#FF0050', strokeWidth: 2, r: 3, stroke: '#11131A' }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
