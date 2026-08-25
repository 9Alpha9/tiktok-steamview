"use client";

import { Card } from "@/components/ui/Card";
import { useEffect, useState, useMemo } from "react";
import { useTikTokLive } from "../TikTokLiveProvider";

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const times = ['00:00', '06:00', '12:00', '18:00', '24:00'];

const getIntensityColor = (intensity: number) => {
  switch(intensity) {
    case 0: return 'bg-[#1e2029]';
    case 1: return 'bg-chart-purple/30';
    case 2: return 'bg-chart-purple/60';
    case 3: return 'bg-[#FF0050]/70';
    case 4: return 'bg-[#FF0050]';
    default: return 'bg-[#1e2029]';
  }
};

export function PeakHours() {
  const { activeUsername, stats } = useTikTokLive();
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);

  // Create a stable seed from the username to generate consistent historical mock heatmap
  const userSeed = useMemo(() => {
    if (!activeUsername) return 0;
    let hash = 0;
    for (let i = 0; i < activeUsername.length; i++) {
      hash = activeUsername.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }, [activeUsername]);

  useEffect(() => {
    const baseData = Array.from({ length: 5 }, () => Array(7).fill(0));
    
    if (!activeUsername) {
      setHeatmapData(baseData);
      return;
    }
    
    const now = new Date();
    const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0-6 (Mon-Sun)
    
    let timeIndex = 0;
    const hour = now.getHours();
    if (hour >= 6 && hour < 12) timeIndex = 1;
    else if (hour >= 12 && hour < 18) timeIndex = 2;
    else if (hour >= 18) timeIndex = 3;
    
    // Generate mock historic patterns based on user hash
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 7; c++) {
        // pseudo-random logic
        const seed = userSeed + (r * 10) + c;
        const rand = (Math.sin(seed) * 10000) % 1;
        let intensity = 0;
        
        // Evening / Weekend bias
        if (r >= 2 && rand > 0.3) intensity += 1;
        if (c >= 4 && rand > 0.5) intensity += 1;
        
        // Pure random variance
        if (rand > 0.8) intensity += 1;
        if (rand > 0.95) intensity = 4;
        
        baseData[r][c] = Math.min(4, intensity);
      }
    }
    
    // Overwrite the current real time slot with real-time viewer engagement equivalent
    const currentViewers = stats.viewers || 0;
    let currentIntensity = 0;
    if (currentViewers > 10000) currentIntensity = 4;
    else if (currentViewers > 2000) currentIntensity = 3;
    else if (currentViewers > 500) currentIntensity = 2;
    else if (currentViewers > 0) currentIntensity = 1;
    
    baseData[timeIndex][currentDay] = currentIntensity;

    setHeatmapData(baseData);
  }, [activeUsername, userSeed, stats.viewers]);

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 p-5">
      <h3 className="font-bold mb-4">Peak Hours</h3>
      
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex flex-1">
          <div className="flex flex-col justify-between text-[10px] text-text-muted pr-3 py-1">
            {times.map(t => <span key={t}>{t}</span>)}
          </div>
          
          <div className="flex-1 grid grid-cols-7 gap-1 grid-rows-5">
            {heatmapData.length > 0 ? heatmapData.map((row, rowIndex) => (
              row.map((intensity, colIndex) => (
                <div 
                  key={`${rowIndex}-${colIndex}`} 
                  className={`w-full h-full rounded-sm ${getIntensityColor(intensity)} transition-colors hover:ring-1 hover:ring-white/50 cursor-crosshair`}
                  title={`Intensity: ${intensity}`}
                />
              ))
            )) : (
               // Loading state fallback
               Array.from({ length: 5 }).map((_, r) => 
                 Array.from({ length: 7 }).map((_, c) => (
                   <div key={`${r}-${c}`} className="w-full h-full rounded-sm bg-[#1e2029]" />
                 ))
               )
            )}
          </div>
        </div>
        
        <div className="flex pl-11 mt-3">
          {days.map(d => (
            <div key={d} className="flex-1 text-center text-[10px] text-text-muted">{d}</div>
          ))}
        </div>
      </div>
    </Card>
  );
}
