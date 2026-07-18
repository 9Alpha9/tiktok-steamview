"use client";

import { Card } from "@/components/ui/Card";
import { Radio, WifiOff, Users, Eye, Clock, UserCheck, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const stats = [
  {
    title: "LIVE NOW",
    value: "23",
    subtitle: "/ 156 accounts",
    icon: Radio,
    color: "text-brand-primary",
    bgColor: "bg-brand-primary/10",
    progress: 15,
  },
  {
    title: "OFFLINE",
    value: "133",
    subtitle: "/ 156 accounts",
    icon: WifiOff,
    color: "text-text-muted",
    bgColor: "bg-white/5",
    progress: 85,
  },
  {
    title: "TOTAL ACCOUNTS",
    value: "156",
    subtitle: "Monitored",
    icon: Users,
    color: "text-chart-purple",
    bgColor: "bg-chart-purple/10",
    trend: { value: 12, label: "this week", up: true },
  },
  {
    title: "TOTAL VIEWERS",
    value: "124.5K",
    subtitle: "Live viewers",
    icon: Eye,
    color: "text-chart-blue",
    bgColor: "bg-chart-blue/10",
    trend: { value: 18.3, label: "", up: true, isPercent: true },
  },
  {
    title: "TOTAL LIVE TIME",
    value: "128h 24m",
    subtitle: "Today",
    icon: Clock,
    color: "text-chart-yellow",
    bgColor: "bg-chart-yellow/10",
    trend: { value: 12.5, label: "", up: true, isPercent: true },
  },
  {
    title: "AVG. VIEWERS",
    value: "8.7K",
    subtitle: "Per live",
    icon: UserCheck,
    color: "text-chart-green",
    bgColor: "bg-chart-green/10",
    trend: { value: 8.2, label: "", up: true, isPercent: true },
  },
];

export function StatCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
      {stats.map((stat, i) => (
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
