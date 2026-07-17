"use client";

import { ArrowRight, Eye, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTikTokLive } from "./TikTokLiveProvider";

export function LiveList() {
  const { activeUsername, stats, status, streamerInfo } = useTikTokLive();
  const isLive = status === "live";
  const liveCount = isLive ? 1 : 0;
  const viewerCount = stats?.viewers && stats.viewers > 0
    ? new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(stats.viewers)
    : "—";

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50">
      <div className="border-b border-border/50 px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#FF0050] shadow-[0_0_8px_rgba(255,0,80,0.85)]" />
          <h3 className="font-bold text-white">Live Now</h3>
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-semibold text-zinc-300">{liveCount}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-text-muted">
          Streams confirmed by the current LIVE connection.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {isLive ? <motion.div
          key={activeUsername}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex w-full items-center rounded-lg border border-[#FF0050]/60 bg-gradient-to-r from-[#FF0050]/10 to-transparent px-3 py-3.5 text-left shadow-[0_0_18px_rgba(255,0,80,0.08)]"
        >
          <span className="absolute -left-px top-3 rounded-r-sm bg-[#FF0050] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">LIVE</span>
          <Avatar src={streamerInfo?.avatar} alt={activeUsername} fallback={activeUsername?.[0]} size="lg" className="ml-8" isLive />
          <div className="ml-3 min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">@{activeUsername}</p>
            <p className="mt-0.5 truncate text-xs text-text-muted">{streamerInfo?.nickname}</p>
          </div>
          <div className="ml-2 flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Eye className="h-3.5 w-3.5" />
            <span>{viewerCount}</span>
          </div>
        </motion.div> : <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <Radio className="mb-3 h-7 w-7 text-text-muted" />
          <p className="text-sm font-medium text-white">No active LIVE stream</p>
          <p className="mt-2 text-xs leading-5 text-text-muted">Streams appear here after the connection confirms they are live.</p>
        </div>}
      </div>

      <div className="p-3 border-t border-border/50">
        <Button variant="ghost" className="w-full bg-white/5 py-2 text-xs text-text-muted hover:text-white">
          View all active streams <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}
