"use client";

import { Circle, MessageSquareText, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTikTokLive } from "./TikTokLiveProvider";
import { useEffect, useState, useRef, useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";

interface ChatEvent {
  type: "chat" | "gift" | "connected" | "disconnected" | "error" | "stream_end" | "stats";
  data?: any;
  message?: unknown;
  username?: string;
  roomInfo?: { viewers: number; likes: number; shares?: number; followers?: number; avatarUrl?: string; title?: string; nickname?: string; hlsPullUrl?: string; flvPullUrl?: string; coverUrl?: string };
}

interface ChatMessage {
  id: string;
  type: "chat" | "gift" | "system";
  username: string;
  message: string;
  timestamp: number;
  avatarUrl?: string;
  giftName?: string;
  giftCount?: number;
  giftIcon?: string;
}

let messageCounter = 0;

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++messageCounter}`;
}

export function LiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { activeUsername, incrementStats, setProfileImage, setStats, setStatus, status, setStreamerDetails, setStreamUrl } = useTikTokLive();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!activeUsername) {
      cleanup();
      setMessages([]);
      setIsConnected(false);
      return;
    }

    setMessages([]);
    setIsConnected(false);

    let settled = false;

    const eventSource = new EventSource(`/api/tiktok?username=${encodeURIComponent(activeUsername)}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const payload: ChatEvent = JSON.parse(event.data);

        if (payload.type === "connected") {
          settled = true;
          setIsConnected(true);
          setStatus("live");
          setProfileImage(payload.roomInfo?.avatarUrl);
          if (payload.roomInfo?.title || payload.roomInfo?.nickname) {
            setStreamerDetails({ title: payload.roomInfo.title, nickname: payload.roomInfo.nickname });
          }
          if (payload.roomInfo?.hlsPullUrl || payload.roomInfo?.flvPullUrl || payload.roomInfo?.coverUrl) {
            setStreamUrl({
              hls: payload.roomInfo.hlsPullUrl || undefined,
              flv: payload.roomInfo.flvPullUrl || undefined,
              cover: payload.roomInfo.coverUrl || undefined,
            });
          }
          setStats({
            viewers: payload.roomInfo?.viewers || 0,
            likes: payload.roomInfo?.likes || 0,
            shares: payload.roomInfo?.shares || 0,
            followers: payload.roomInfo?.followers || 0,
          });
          setMessages(prev => [...prev, {
            id: uniqueId("sys-conn"),
            type: "system",
            username: "System",
            message: `Connected to @${activeUsername}'s live stream.`,
            timestamp: Date.now(),
          } as ChatMessage]);
        }

        if (payload.type === "disconnected" || payload.type === "stream_end") {
          settled = true;
          setIsConnected(false);
          setStatus("offline");
          setMessages([]);
          setStreamUrl({});
          eventSource.close();
        }

        if (payload.type === "stats" && payload.data) {
          const { giftsIncrement, followersIncrement, sharesIncrement, ...latestStats } = payload.data;
          if (Object.keys(latestStats).length > 0) setStats(latestStats);
          incrementStats({
            gifts: giftsIncrement,
            followers: followersIncrement,
            shares: sharesIncrement,
          });
        }

        if (payload.type === "chat" && payload.data) {
          setMessages(prev => {
            const updated = [...prev, {
              id: payload.data?.common?.msgId ? `chat-${payload.data.common.msgId}-${Date.now()}` : uniqueId("chat"),
              type: "chat",
              username: payload.data?.user?.displayId || payload.data?.user?.nickname || payload.data?.uniqueId || "User",
              message: payload.data?.content || payload.data?.comment || "",
              avatarUrl: payload.data?.user?.avatarThumb?.urlList?.[0] || payload.data?.profilePictureUrl,
              timestamp: Date.now(),
            } as ChatMessage];
            return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
          });
        }

        if (payload.type === "gift" && payload.data) {
          setMessages(prev => {
            const giftName = payload.data?.gift?.name || payload.data?.giftName || "a gift";
            const giftCount = payload.data?.comboCount || payload.data?.repeatCount || 1;
            const updated = [...prev, {
              id: payload.data?.common?.msgId ? `gift-${payload.data.common.msgId}-${Date.now()}` : uniqueId("gift"),
              type: "gift",
              username: payload.data?.user?.displayId || payload.data?.user?.nickname || payload.data?.uniqueId || "User",
              message: `Sent ${giftName} x${giftCount}`,
              avatarUrl: payload.data?.user?.avatarThumb?.urlList?.[0] || payload.data?.profilePictureUrl,
              giftName: giftName,
              giftCount: giftCount,
              giftIcon: payload.data?.gift?.image?.urlList?.[0] || payload.data?.giftPictureUrl,
              timestamp: Date.now(),
            } as ChatMessage];
            return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
          });
        }

        if (payload.type === "error") {
          settled = true;
          setMessages([]);
          setIsConnected(false);
          setStatus("offline");
          setStreamUrl({});
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      if (!settled) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
        }, 5000);
      } else {
        setIsConnected(false);
      }
    };

    return cleanup;
  }, [activeUsername, cleanup, incrementStats, setProfileImage, setStats, setStatus, setStreamerDetails, setStreamUrl]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 overflow-hidden">
      <div className="p-3 border-b border-border/50 bg-[#171923] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquareText className="h-4 w-4 text-[#00F2FE]" />
          <h3 className="font-bold text-sm">Live Chat</h3>
        </div>
        <div className="flex items-center space-x-1 text-xs text-text-muted">
          <ShieldCheck className={`h-3 w-3 ${isConnected ? "text-emerald-400" : "text-zinc-500"}`} />
          <span>{isConnected ? "Connected (Live)" : "Connecting..."}</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Circle className="mb-3 h-7 w-7 text-text-muted" />
            <p className="text-sm font-medium text-white">
              {!activeUsername ? "Enter a username to start" : status === "offline" ? "No active LIVE chat" : "Waiting for live chat"}
            </p>
            <p className="mt-2 text-xs leading-5 text-text-muted">
              {!activeUsername
                ? "Search for a TikTok account in the search bar above."
                : status === "offline"
                  ? "Chat appears after a LIVE stream is confirmed."
                  : "Messages will appear when the connection is ready."}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start space-x-2 animate-in fade-in slide-in-from-bottom-2 ${msg.type === 'gift' ? 'bg-[#FF0050]/10 p-2 rounded-lg border border-[#FF0050]/20' : ''}`}>
            {msg.type !== 'system' ? (
              <Avatar
                src={msg.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${msg.username}`}
                fallback={msg.username[0]}
                size="sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-4 w-4 text-zinc-400" />
              </div>
            )}

            <div className="flex flex-col flex-1">
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-semibold ${msg.type === 'system' ? 'text-zinc-400' : 'text-zinc-300'}`}>
                  {msg.username}
                </span>
              </div>
              <span className={`text-sm ${msg.type === 'gift' ? 'text-[#FF0050] font-medium flex items-center gap-1' : 'text-white'}`}>
                {msg.message}
                {msg.type === 'gift' && msg.giftIcon && (
                  <img src={msg.giftIcon} alt={msg.giftName} className="w-4 h-4 object-contain inline-block" />
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
