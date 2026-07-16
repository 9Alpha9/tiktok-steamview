"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTikTokLive } from "./TikTokLiveProvider";

const subscribeToEmbedDomain = () => () => {};
const getServerEmbedDomain = () => null;

function getEmbedDomain() {
  return process.env.NEXT_PUBLIC_TIKTOK_EMBED_DOMAIN?.trim() || window.location.hostname;
}

export function StreamPlayer() {
  const { activeUsername, streamerInfo } = useTikTokLive();
  // Send the hostname of the page containing the iframe. TikTok validates the
  // domain itself, so the app must not prevent local development from trying
  // to load the official player.
  const embedDomain = useSyncExternalStore(subscribeToEmbedDomain, getEmbedDomain, getServerEmbedDomain);

  const canRenderEmbed = Boolean(embedDomain);
  const playerUrl = canRenderEmbed
    ? `https://www.tiktok.com/embed/live/@${encodeURIComponent(activeUsername)}?autoplay=1&muted=1&controls=1&embed_domain=${encodeURIComponent(embedDomain!)}`
    : null;

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 overflow-hidden relative">
      <div className="p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-3">
          <Avatar src={streamerInfo.avatar} fallback={activeUsername[0]} alt={activeUsername} size="default" />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-white">@{activeUsername}</h2>
              <Badge variant="outline" className="gap-1 border-emerald-400/40 text-emerald-300">
                <ShieldCheck className="h-3 w-3" /> Official embed
              </Badge>
            </div>
            <p className="text-xs text-zinc-300 font-medium">TikTok LIVE Player</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-[#0e1015] relative flex items-center justify-center overflow-hidden">
        {!embedDomain ? (
          <p className="text-sm text-text-muted">Preparing official player…</p>
        ) : canRenderEmbed && playerUrl ? (
          <iframe
            key={playerUrl}
            src={playerUrl}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen"
            allowFullScreen
            loading="lazy"
            title={`TikTok LIVE from @${activeUsername}`}
          />
        ) : null}
      </div>

      <div className="border-t border-border/50 bg-[#171923] px-4 py-3 text-xs text-text-muted flex items-center justify-between gap-4">
        <span>Playback stays inside TikTok&apos;s official player.</span>
        <Button
          variant="ghost"
          className="h-auto px-0 py-0 text-xs text-text-muted hover:text-white"
          onClick={() => window.open(`https://www.tiktok.com/@${activeUsername}/live`, "_blank", "noopener,noreferrer")}
        >
          Creator page <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}
