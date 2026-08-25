"use client";

import { Card } from "@/components/ui/Card";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useTikTokLive } from "./TikTokLiveProvider";

interface Activity {
  user: string;
  action: string;
  time: string;
  status: "live" | "offline";
  timestamp: number;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { setActiveUsername } = useTikTokLive();

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/suggested");
      const data = await res.json();
      
      const newActivities = (data.lives || []).slice(0, 5).map((live: any, index: number) => ({
        user: `@${live.username}`,
        action: "went live",
        // Fake relative time based on viewer count or index for demo purposes
        // In a real app this would be real data from a DB
        time: `${Math.max(1, Math.floor(index * 2.5 + 1))} minutes ago`,
        status: "live" as const,
        timestamp: Date.now() - (index * 60000),
        rawUsername: live.username
      }));

      setActivities(newActivities);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 60_000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchActivity]);

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold">Recent Activity</h3>
        {loading && <RefreshCw className="w-3 h-3 text-text-muted animate-spin" />}
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
        {activities.length > 0 ? activities.map((activity: any, index) => (
          <div 
            key={`${activity.user}-${index}`} 
            className="flex items-center justify-between group cursor-pointer"
            onClick={() => setActiveUsername(activity.rawUsername)}
          >
            <div className="flex items-center min-w-0 pr-4">
              <div 
                className={`w-2 h-2 rounded-full mr-3 shrink-0 ${activity.status === 'live' ? 'bg-brand-primary shadow-[0_0_8px_rgba(255,0,80,0.6)]' : 'bg-chart-green'}`} 
              />
              <span className="text-sm font-medium mr-1 truncate">{activity.user}</span>
              <span className="text-xs text-text-muted shrink-0">{activity.action}</span>
            </div>
            <div className="flex items-center text-xs text-text-muted group-hover:text-[#00F2FE] transition-colors shrink-0">
              {activity.time}
              <ChevronRight className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )) : !loading && (
          <div className="h-full flex items-center justify-center text-xs text-text-muted">
            No recent activity found.
          </div>
        )}
      </div>
    </Card>
  );
}
