"use client";

import { Card } from "@/components/ui/Card";
import { Sparkles } from "lucide-react";
import { useTikTokLive } from "./TikTokLiveProvider";

function formatNumber(n: number | string): string {
  const num = Number(n);
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

export function LiveDetails() {
  const { streamerInfo } = useTikTokLive();

  const rows = [
    { label: "Username", value: streamerInfo.username, highlight: true },
    { label: "Display Name", value: streamerInfo.nickname },
    { label: "Status", value: streamerInfo.status === "live" ? "Live Now" : "Offline", highlight: streamerInfo.status === "live" },
    { label: "Category", value: streamerInfo.category || "Chatting" },
    { label: "Location", value: streamerInfo.location || "Indonesia" },
    { label: "Viewers", value: formatNumber(streamerInfo.viewers) },
    { label: "Likes", value: formatNumber(streamerInfo.likes) },
    { label: "Shares", value: formatNumber(streamerInfo.shares || 0) },
    { label: "Gifts", value: formatNumber(streamerInfo.gifts || 0) },
    { label: "Follower", value: formatNumber(streamerInfo.followerCount || 0) },
    { label: "Following", value: formatNumber(streamerInfo.followingCount || 0) },
  ];

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 overflow-hidden">
      <div className="p-3 border-b border-border/50 bg-[#171923] flex items-center space-x-2">
        <Sparkles className="w-4 h-4 text-[#FF0050]" />
        <h3 className="font-bold text-sm">Live Details</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-0">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border/30 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-2.5 text-text-muted font-medium text-xs whitespace-nowrap">
                  {row.label}
                </td>
                <td className={`px-4 py-2.5 text-right font-semibold text-xs whitespace-nowrap ${row.highlight ? 'text-[#00F2FE]' : 'text-white'}`}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
