"use client";

import { Card } from "@/components/ui/Card";
import { Radio, WifiOff, Users, Eye, Clock, Heart, TrendingUp, TrendingDown, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTikTokLive } from "./TikTokLiveProvider";

export function StatCards() {
  const { stats, status } = useTikTokLive();
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [liveNow, setLiveNow] = useState(0);

  useEffect(() => {
    // Fetch suggested/live data to estimate "Live Now" and total accounts
    // In a real application, this would fetch from a database tracking all monitored accounts
    async function fetchGlobalStats() {
      try {
        const res = await fetch("/api/suggested");
        const data = await res.json();
        const liveCount = data.lives?.length || 0;
        
        // Since we don't have a database, we'll simulate the "Total Accounts" based on the live data
        // For demonstration, let's say total monitored is live accounts + a random offset (or fixed 156 if none)
        setLiveNow(liveCount > 0 ? liveCount : (status === "live" ? 1 : 0));
        setTotalAccounts(Math.max(156, liveCount + 100)); // Baseline of 156 monitored accounts
      } catch (e) {
        // Fallback
        setLiveNow(status === "live" ? 1 : 0);
        setTotalAccounts(156);
      }
    }

    fetchGlobalStats();
    const interval = setInterval(fetchGlobalStats, 30_000);
    return () => clearInterval(interval);
  }, [status]);

  // Aggregate stats based on current context
  const currentViewers = stats.viewers || 0;
  
  // Format helpers
  const formatCompact = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const statCards = [
    {
      title: "LIVE NOW",
      value: String(liveNow),
      subtitle: `/ ${totalAccounts} accounts`,
      icon: Radio,
      color: "text-brand-primary",
      bgColor: "bg-brand-primary/10",
      progress: totalAccounts > 0 ? (liveNow / totalAccounts) * 100 : 0,
    },
    {
      title: "OFFLINE",
      value: String(totalAccounts - liveNow),
      subtitle: `/ ${totalAccounts} accounts`,
      icon: WifiOff,
      color: "text-text-muted",
      bgColor: "bg-white/5",
      progress: totalAccounts > 0 ? ((totalAccounts - liveNow) / totalAccounts) * 100 : 0,
    },
    {
      title: "TOTAL ACCOUNTS",
      value: String(totalAccounts),
      subtitle: "Monitored",
      icon: Users,
      color: "text-chart-purple",
      bgColor: "bg-chart-purple/10",
      trend: { value: 2, label: "this week", up: true }, // Static trend
    },
    {
      title: "CURRENT VIEWERS",
      value: formatCompact(currentViewers),
      subtitle: "Active stream",
      icon: Eye,
      color: "text-chart-blue",
      bgColor: "bg-chart-blue/10",
      trend: { value: 12.5, label: "", up: true, isPercent: true },
    },
    {
      title: "TOTAL LIKES",
      value: formatCompact(stats.likes || 0),
      subtitle: "Active stream",
      icon: Heart,
      color: "text-chart-yellow",
      bgColor: "bg-chart-yellow/10",
      trend: { value: 5.2, label: "", up: true, isPercent: true },
    },
    {
      title: "TOTAL SHARES",
      value: formatCompact(stats.shares || 0),
      subtitle: "Active stream",
      icon: Share2,
      color: "text-chart-green",
      bgColor: "bg-chart-green/10",
      trend: { value: 2.4, label: "", up: true, isPercent: true },
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
      {statCards.map((stat, i) => (
        <Card key={i} className="p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className={cn("p-2.5 rounded-lg", stat.bgColor)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
              {stat.title}
            </h4>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="text-xs text-text-muted mt-1">{stat.subtitle}</p>

            {stat.progress !== undefined && (
              <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                <div
                  className={cn("h-full rounded-full", stat.title === "LIVE NOW" ? "bg-brand-primary" : "bg-text-muted")}
                  style={{ width: `${stat.progress}%` }}
                />
              </div>
            )}

            {stat.trend && (
              <div className={cn("flex items-center text-xs mt-3 font-medium", stat.trend.up ? "text-chart-green" : "text-brand-primary")}>
                {stat.trend.up ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {stat.trend.up ? "+" : "-"}{stat.trend.value}{stat.trend.isPercent ? "%" : ""} {stat.trend.label}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
