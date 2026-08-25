"use client";

import { Card } from "@/components/ui/Card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ChevronDown, Activity } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useTikTokLive } from "../TikTokLiveProvider";

type TimeRange = "7 Days" | "14 Days" | "30 Days";

export function LiveTrend() {
  const { activeUsername, stats } = useTikTokLive();
  const [data, setData] = useState<{ name: string; viewers: number }[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("7 Days");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const daysCount = timeRange === "7 Days" ? 7 : timeRange === "14 Days" ? 14 : 30;

  // Create a stable numeric seed from the username to generate consistent historical mock data
  const userSeed = useMemo(() => {
    if (!activeUsername) return 0;
    let hash = 0;
    for (let i = 0; i < activeUsername.length; i++) {
      hash = activeUsername.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }, [activeUsername]);

  // Base historical data
  const historyBase = useMemo(() => {
    const pastData = [];
    const now = new Date();
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = daysCount === 30 
        ? d.toLocaleDateString('en-US', { day: 'numeric' }) 
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
      if (!activeUsername) {
         // Flat chart when no user is selected
         pastData.push({ name: dayStr, viewers: 0 });
      } else {
         // Generate pseudo-random realistic history for this specific user
         const seed = userSeed + i;
         const x = Math.sin(seed) * 10000;
         const randomFactor = x - Math.floor(x);
         
         // Using a sine wave based on time for smoother, more realistic trends
         const smoothWave = Math.sin((daysCount - i) / (daysCount / (Math.PI * 2))) * 1500;
         const baseViewers = 1000 + smoothWave + (randomFactor * 1000); 
         
         pastData.push({ name: dayStr, viewers: Math.floor(Math.max(100, baseViewers)) });
      }
    }
    return pastData;
  }, [activeUsername, userSeed, daysCount]);

  useEffect(() => {
    if (historyBase.length === 0) return;
    
    const newData = [...historyBase];
    // Override the "today" (last point) with REAL real-time viewers for the active account
    if (activeUsername) {
       newData[newData.length - 1] = {
         ...newData[newData.length - 1],
         viewers: stats.viewers || 0
       };
    }
    
    setData(newData);
  }, [historyBase, activeUsername, stats.viewers]);

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 p-5">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 shrink-0 pr-2">
          <h3 className="font-bold flex items-center whitespace-nowrap">
            Live Trend <span className="text-text-muted font-normal text-xs ml-1.5 whitespace-nowrap">({timeRange})</span>
          </h3>
          {activeUsername && (
            <span className="flex items-center text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-1.5 py-0.5 rounded-full w-fit">
              <Activity className="w-3 h-3 mr-1 shrink-0" /> Realtime
            </span>
          )}
        </div>
        
        <div className="relative z-20 shrink-0">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            className="text-[11px] text-text-muted hover:text-white flex items-center transition-colors bg-white/5 px-2 py-1.5 rounded-md border border-white/5 outline-none whitespace-nowrap"
          >
            {timeRange} <ChevronDown className="w-3 h-3 ml-1 shrink-0" />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-28 bg-[#171923] border border-border/50 rounded-md shadow-lg overflow-hidden py-1">
              {(["7 Days", "14 Days", "30 Days"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setTimeRange(range);
                    setIsDropdownOpen(false);
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[200px] z-10">
        {data.length > 0 && (
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
                interval={timeRange === "30 Days" ? 4 : timeRange === "14 Days" ? 1 : 0}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(value < 1000 && value > 0 ? 1 : 0)}K`}
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
                dot={timeRange === "30 Days" ? false : { fill: '#FF0050', strokeWidth: 2, r: 3, stroke: '#11131A' }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
