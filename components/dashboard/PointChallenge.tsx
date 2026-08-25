"use client";

import { Card } from "@/components/ui/Card";
import { Trophy } from "lucide-react";
import { useTikTokLive } from "./TikTokLiveProvider";

function formatNumber(value: number): string {
  return value >= 0
    ? new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value)
    : "0";
}

export function PointChallenge() {
  const { goal } = useTikTokLive();

  if (!goal) {
    return (
      <Card className="flex flex-col h-full bg-[#11131A] border-border/50 overflow-hidden">
        <div className="p-3 border-b border-border/50 bg-[#171923] flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-sm">Point Challenge</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs">
          No active challenge
        </div>
      </Card>
    );
  }

  const isDuel = goal.subGoals.length === 2;

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 overflow-hidden">
      <div className="p-3 border-b border-border/50 bg-[#171923] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-sm">Point Challenge</h3>
        </div>
        <span className="text-[10px] text-zinc-500">{isDuel ? "1v1" : goal.subGoals.length > 2 ? "Team" : "Solo"}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isDuel ? (
          <>
            {/* Duel: Red vs Blue */}
            <div className="space-y-2">
              {goal.subGoals.map((sg, idx) => {
                const pct = sg.target > 0 ? Math.min((sg.progress / sg.target) * 100, 100) : 0;
                const isRed = idx === 0;
                const color = isRed ? "#FF0050" : "#00BFFF";
                const bgColor = isRed ? "from-red-500 to-rose-500" : "from-cyan-500 to-blue-500";
                return (
                  <div key={sg.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-xs text-zinc-300">{sg.giftName || (isRed ? "Red Team" : "Blue Team")}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">{formatNumber(sg.progress)} / {formatNumber(sg.target)}</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${bgColor} transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Solo/Team: single or multiple bars */}
            {goal.subGoals.map((sg) => {
              const pct = sg.target > 0 ? Math.min((sg.progress / sg.target) * 100, 100) : 0;
              const isComplete = pct >= 100;
              return (
                <div key={sg.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    {sg.giftIcon && <img src={sg.giftIcon} alt="" className="w-4 h-4 rounded-sm" />}
                    <span className="text-xs text-zinc-300 truncate flex-1 ml-2">{sg.giftName}</span>
                    <span className={`text-[10px] font-mono ${isComplete ? "text-emerald-400" : "text-zinc-400"}`}>{formatNumber(sg.progress)} / {formatNumber(sg.target)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete ? "bg-emerald-500" : "bg-gradient-to-r from-pink-500 to-rose-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Top contributors */}
        {goal.contributors.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Top Contributors</p>
            <div className="space-y-1">
              {goal.contributors.slice(0, 5).map((c, i) => (
                <div key={c.userId} className="flex items-center space-x-2 py-1 px-2 rounded-lg bg-zinc-800/50">
                  <span className="text-[10px] font-bold text-zinc-500 w-4 text-center">{i + 1}</span>
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt={c.displayId} className="w-5 h-5 rounded-full" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-zinc-700" />
                  )}
                  <span className="text-xs text-zinc-300 truncate flex-1">{c.displayId}</span>
                  <span className="text-[10px] font-mono text-amber-400">{formatNumber(c.score)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="text-[10px] text-zinc-500">
            <span className="font-semibold text-zinc-400">{goal.stats.totalContributor}</span> contributors
          </div>
          <div className="text-[10px] text-zinc-500">
            <span className="font-semibold text-zinc-400">{formatNumber(goal.stats.totalCoins)}</span> coins
          </div>
        </div>
      </div>
    </Card>
  );
}
