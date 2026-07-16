"use client";

import { Card } from "@/components/ui/Card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const data = [
  { name: 'Chatting', value: 45, count: 70, color: '#FF0050' },
  { name: 'Gaming', value: 25, count: 39, color: '#3B82F6' },
  { name: 'Music', value: 15, count: 23, color: '#F59E0B' },
  { name: 'Comedy', value: 10, count: 16, color: '#8B5CF6' },
  { name: 'Others', value: 5, count: 8, color: '#9ca3af' },
];

export function TopCategories() {
  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 p-5">
      <h3 className="font-bold mb-6">Top Categories</h3>
      
      <div className="flex-1 flex items-center">
        <div className="w-1/2 h-full min-h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2230', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="w-1/2 flex flex-col space-y-3 pl-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                <span className="text-white/80">{item.name}</span>
              </div>
              <div className="flex space-x-2 text-right">
                <span className="font-medium">{item.value}%</span>
                <span className="text-text-muted">({item.count})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
