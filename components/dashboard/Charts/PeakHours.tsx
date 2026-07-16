"use client";

import { Card } from "@/components/ui/Card";

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const times = ['00:00', '06:00', '12:00', '18:00', '24:00'];

// Generating mock intensity data (0-4)
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
  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 p-5">
      <h3 className="font-bold mb-4">Peak Hours</h3>
      
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex">
          <div className="flex flex-col justify-between text-[10px] text-text-muted pr-3 py-1">
            {times.map(t => <span key={t}>{t}</span>)}
          </div>
          
          <div className="flex-1 grid grid-cols-7 gap-1">
            {/* Generate 5 rows x 7 cols of heatmap cells */}
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              Array.from({ length: 7 }).map((_, colIndex) => {
                // Mock logic to make evenings/weekends hotter
                let intensity = 0;
                if (rowIndex >= 3) intensity += 2; // Evening
                if (colIndex >= 5) intensity += 1; // Weekend
                if (rowIndex === 3 && colIndex === 5) intensity = 4; // Peak
                if (rowIndex === 2 && colIndex === 3) intensity = 1; 
                
                return (
                  <div 
                    key={`${rowIndex}-${colIndex}`} 
                    className={`w-full h-full rounded-sm ${getIntensityColor(intensity)} transition-colors hover:ring-1 hover:ring-white/50 cursor-crosshair`}
                  />
                );
              })
            ))}
          </div>
        </div>
        
        <div className="flex pl-11 mt-2">
          {days.map(d => (
            <div key={d} className="flex-1 text-center text-[10px] text-text-muted">{d}</div>
          ))}
        </div>
      </div>
    </Card>
  );
}
