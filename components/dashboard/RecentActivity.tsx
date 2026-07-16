"use client";

import { Card } from "@/components/ui/Card";
import { ChevronRight } from "lucide-react";

const activities = [
  { user: "@fuji_an", action: "went live", time: "2 minutes ago", status: "live" },
  { user: "@riaricis1795", action: "went live", time: "4 minutes ago", status: "live" },
  { user: "@putri.delinaa", action: "went live", time: "7 minutes ago", status: "live" },
  { user: "@fadiljaidi", action: "went offline", time: "10 minutes ago", status: "offline" },
  { user: "@ridwanramadhann", action: "went live", time: "12 minutes ago", status: "live" },
];

export function RecentActivity() {
  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 p-5">
      <h3 className="font-bold mb-6">Recent Activity</h3>
      
      <div className="flex-1 space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-center justify-between group cursor-pointer">
            <div className="flex items-center">
              <div 
                className={`w-2 h-2 rounded-full mr-3 ${activity.status === 'live' ? 'bg-brand-primary shadow-[0_0_8px_rgba(255,0,80,0.6)]' : 'bg-chart-green'}`} 
              />
              <span className="text-sm font-medium mr-1">{activity.user}</span>
              <span className="text-sm text-text-muted">{activity.action}</span>
            </div>
            <div className="flex items-center text-xs text-text-muted group-hover:text-white transition-colors">
              {activity.time}
              <ChevronRight className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
