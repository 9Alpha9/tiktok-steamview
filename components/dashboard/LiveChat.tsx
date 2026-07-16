"use client";

import { MessageSquareText, ShieldCheck, User } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTikTokLive } from "./TikTokLiveProvider";
import { useEffect, useState, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";

interface ChatEvent {
  type: "chat" | "gift" | "connected" | "disconnected" | "error";
  data?: any;
  message?: string;
  username?: string;
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

export function LiveChat() {
  const { activeUsername } = useTikTokLive();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!activeUsername) return;

    setMessages([]);
    setIsConnected(false);

    const eventSource = new EventSource(`/api/tiktok?username=${encodeURIComponent(activeUsername)}`);

    eventSource.onmessage = (event) => {
      try {
        const payload: ChatEvent = JSON.parse(event.data);
        
        if (payload.type === "connected") {
          setIsConnected(true);
          setMessages(prev => [...prev, {
            id: `sys-${Date.now()}`,
            type: "system",
            username: "System",
            message: `Connected to @${activeUsername}'s live stream.`,
            timestamp: Date.now(),
          } as ChatMessage]);
        }
        
        if (payload.type === "disconnected") {
          setIsConnected(false);
          setMessages(prev => [...prev, {
            id: `sys-${Date.now()}`,
            type: "system",
            username: "System",
            message: "Disconnected from live stream.",
            timestamp: Date.now(),
          } as ChatMessage]);
        }

        if (payload.type === "chat" && payload.data) {
          setMessages(prev => {
            const updated = [...prev, {
              id: payload.data.msgId || `chat-${Date.now()}`,
              type: "chat",
              username: payload.data.uniqueId || "User",
              message: payload.data.comment,
              avatarUrl: payload.data.profilePictureUrl,
              timestamp: Date.now(),
            } as ChatMessage];
            return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
          });
        }

        if (payload.type === "gift" && payload.data) {
          setMessages(prev => {
            const updated = [...prev, {
              id: payload.data.msgId || `gift-${Date.now()}`,
              type: "gift",
              username: payload.data.uniqueId || "User",
              message: `Sent ${payload.data.giftName} x${payload.data.repeatCount}`,
              avatarUrl: payload.data.profilePictureUrl,
              giftName: payload.data.giftName,
              giftCount: payload.data.repeatCount,
              giftIcon: payload.data.giftPictureUrl,
              timestamp: Date.now(),
            } as ChatMessage];
            return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
          });
        }
        
        if (payload.type === "error") {
          console.error("TikTok live error:", payload.message);
          setMessages(prev => [...prev, {
            id: `sys-err-${Date.now()}`,
            type: "system",
            username: "Error",
            message: payload.message || "Connection error",
            timestamp: Date.now(),
          } as ChatMessage]);
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [activeUsername]);

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
          <div className="h-full flex items-center justify-center text-xs text-zinc-500">
            Waiting for messages...
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
      
      <div className="p-3 border-t border-border/50 bg-[#171923]">
        <div className="w-full bg-[#0e1015] rounded-full py-2 px-4 text-xs text-text-muted flex items-center justify-between">
          <span>Log in to chat</span>
          <User className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}
