"use client";

import { Eye, Radio, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { useTikTokLive } from "./TikTokLiveProvider";
import { StreamStats } from "./StreamStats";
import { useEffect, useState, useCallback, useRef } from "react";

interface SuggestedLive {
  username: string;
  nickname: string;
  avatar: string;
  viewers: number;
  title: string;
  coverUrl: string;
}

function formatViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function LiveList() {
  const { activeUsername, stats, status, streamerInfo, setActiveUsername } = useTikTokLive();
  const isLive = status === "live";
  const [suggested, setSuggested] = useState<SuggestedLive[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSuggested = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suggested");
      const data = await res.json();
      setSuggested(data.lives || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggested();
    intervalRef.current = setInterval(fetchSuggested, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchSuggested]);

  const viewerCount = stats?.viewers && stats.viewers > 0
    ? new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(stats.viewers)
    : "\u2014";

  const filtered = suggested.filter((s) => s.username !== activeUsername);

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50">
      <div className="border-b border-border/50 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#FF0050] shadow-[0_0_8px_rgba(255,0,80,0.85)]" />
            <h3 className="font-bold text-white text-sm">Live Now</h3>
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-semibold text-zinc-300">
              {isLive ? filtered.length + 1 : filtered.length}
            </span>
          </div>
          <button
            onClick={fetchSuggested}
            disabled={loading}
            className="text-text-muted hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {isLive && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2 px-1">Current Stream</p>
            <motion.div
              key={activeUsername}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative flex w-full items-center rounded-lg border border-[#FF0050]/60 bg-gradient-to-r from-[#FF0050]/10 to-transparent px-3 py-3 text-left shadow-[0_0_18px_rgba(255,0,80,0.08)]"
            >
              <span className="absolute -left-px top-2.5 rounded-r-sm bg-[#FF0050] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">LIVE</span>
              <Avatar src={streamerInfo?.avatar} alt={activeUsername} fallback={activeUsername?.[0]} size="lg" className="ml-8" isLive />
              <div className="ml-3 min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">@{activeUsername}</p>
                <p className="mt-0.5 truncate text-xs text-text-muted">{streamerInfo?.nickname}</p>
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Eye className="h-3.5 w-3.5" />
                <span>{viewerCount}</span>
              </div>
            </motion.div>
          </div>
        )}

        {isLive && <StreamStats />}

        {filtered.length > 0 && (
          <div>
               <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2 px-1">
               Live Candidates
             </p>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filtered.slice(0, 15).map((live) => (
                  <motion.button
                    key={live.username}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => setActiveUsername(live.username)}
                    className="relative flex w-full items-center rounded-lg border border-white/5 bg-white/[0.02] px-3 py-3 text-left hover:bg-white/5 hover:border-white/10 transition-all group"
                  >
                    <span className="absolute -left-px top-2.5 rounded-r-sm bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">CHECK</span>
                    <div className="relative ml-5">
                      <Avatar
                        src={live.avatar}
                        alt={live.username}
                        fallback={live.username[0]}
                        size="lg"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#11131A] bg-[#FF0050]" />
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white group-hover:text-[#00F2FE] transition-colors">
                        @{live.username}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">{live.nickname}</p>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-400">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{formatViewers(live.viewers)}</span>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {!isLive && filtered.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Radio className="mb-3 h-7 w-7 text-text-muted" />
            <p className="text-sm font-medium text-white">No LIVE suggestions available</p>
            <p className="mt-2 text-xs leading-5 text-text-muted">
              Refresh shortly or search for a creator who is currently live.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
