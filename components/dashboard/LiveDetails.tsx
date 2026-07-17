"use client";

import { Card } from "@/components/ui/Card";
import { Circle, Sparkles, Eye, Heart, Share2, Gift, Users } from "lucide-react";
import { useTikTokLive } from "./TikTokLiveProvider";

function formatNumber(value: number): string {
  return value > 0
    ? new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value)
    : "—";
}

export function LiveDetails() {
  const { streamerInfo, stats, status } = useTikTokLive();

  const rows = [
    { label: "Username", value: streamerInfo.username, highlight: true },
    { label: "Playback", value: status === "live" ? "LIVE" : status === "connecting" ? "CONNECTING" : "OFFLINE", highlight: status === "live", statusColor: status === "live" ? "text-emerald-400" : status === "connecting" ? "text-amber-400" : "text-zinc-500" },
    { label: "Viewers", value: formatNumber(stats.viewers), icon: Eye },
    { label: "Likes", value: formatNumber(stats.likes), icon: Heart },
    { label: "Shares", value: formatNumber(stats.shares), icon: Share2 },
    { label: "Gifts", value: formatNumber(stats.gifts), icon: Gift },
    { label: "Followers", value: formatNumber(stats.followers), icon: Users },
  ];

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 overflow-hidden">
      <div className="p-3 border-b border-border/50 bg-[#171923] flex items-center space-x-2">
        <Sparkles className="w-4 h-4 text-[#FF0050]" />
        <h3 className="font-bold text-sm">Live Details</h3>
      </div>
      
      {status !== "offline" ? <div className="flex-1 overflow-y-auto p-0">
        {streamerInfo.title && (
          <div className="px-4 py-3 border-b border-border/30 bg-white/[0.02]">
            <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-1">Stream Title</p>
            <p className="text-xs text-white leading-relaxed">{streamerInfo.title}</p>
          </div>
        )}
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border/30 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-2.5 text-text-muted font-medium text-xs whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    {row.icon && <row.icon className="h-3 w-3 text-zinc-500" />}
                    {row.label}
                  </span>
                </td>
                <td className={`px-4 py-2.5 text-right font-semibold text-xs whitespace-nowrap ${row.statusColor || (row.highlight ? 'text-[#00F2FE]' : 'text-white')}`}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> : <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Circle className="mb-3 h-7 w-7 text-text-muted" />
        <p className="text-sm font-medium text-white">No active LIVE details</p>
        <p className="mt-2 text-xs leading-5 text-text-muted">Details appear after the official player confirms the stream.</p>
      </div>}
    </Card>
  );
}
