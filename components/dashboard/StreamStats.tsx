"use client";

import { Eye, Heart, Gift, Share2, Users } from "lucide-react";
import { useTikTokLive } from "./TikTokLiveProvider";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export function StreamStats() {
  const { stats, status, topContributors, recentActivity } = useTikTokLive();
  const isLive = status === "live";

  if (!isLive) return null;

  const statCards = [
    { label: "Viewers", value: stats.viewers, icon: Eye, color: "text-cyan-400" },
    { label: "Likes", value: stats.likes, icon: Heart, color: "text-pink-400" },
    { label: "Gifts", value: stats.gifts, icon: Gift, color: "text-amber-400" },
    { label: "Shares", value: stats.shares, icon: Share2, color: "text-emerald-400" },
    { label: "Followers", value: stats.followers, icon: Users, color: "text-violet-400" },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        {statCards.slice(0, 3).map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 rounded-lg bg-white/[0.03] border border-white/5 px-2 py-2.5">
            <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
            <span className="text-xs font-bold text-white tabular-nums">{formatNumber(s.value)}</span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Top Contributors */}
      {topContributors.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-1">Top Givers</p>
          <div className="space-y-1">
            {topContributors.slice(0, 5).map((c, i) => (
              <div key={c.username} className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/5 px-2.5 py-2">
                <span className="text-[10px] font-bold text-zinc-500 w-3 text-center">{i + 1}</span>
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="" className="w-5 h-5 rounded-full border border-white/10 object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-zinc-700 border border-white/10" />
                )}
                <span className="text-xs text-zinc-300 truncate flex-1">@{c.username}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-amber-400">💎</span>
                  <span className="text-[10px] font-mono text-amber-400">{c.totalDiamonds.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-1">Recent Activity</p>
          <div className="space-y-1">
            {recentActivity.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/5 px-2.5 py-1.5">
                {a.avatarUrl ? (
                  <img src={a.avatarUrl} alt="" className="w-4 h-4 rounded-full border border-white/10 object-cover" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-zinc-700 border border-white/10" />
                )}
                <span className="text-[11px] text-zinc-300 truncate flex-1">
                  <span className="font-semibold text-white">{a.username}</span>{" "}
                  <span className="text-zinc-500">{a.detail}</span>
                </span>
                <span className="text-[9px] text-zinc-600 shrink-0">{timeAgo(a.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
