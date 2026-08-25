"use client";

import { Circle, MessageSquareText, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTikTokLive } from "./TikTokLiveProvider";
import { useEffect, useState, useRef, useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";

interface ChatEvent {
  type: "chat" | "gift" | "connected" | "disconnected" | "error" | "stream_end" | "stats" | "battle" | "battle_update" | "stream_url";
  data?: any;
  message?: unknown;
  username?: string;
  roomInfo?: { viewers: number; likes: number; shares?: number; followers?: number; avatarUrl?: string; title?: string; nickname?: string; hlsPullUrl?: string; flvPullUrl?: string; coverUrl?: string };
}

interface BadgeInfo {
  type: string;
  name: string;
  level?: number;
  url?: string;
  color?: string;
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
  badges?: BadgeInfo[];
  emotes?: { placeInComment: number; emoteImageUrl: string }[];
}

function extractBadges(user: any, userDetails?: any): BadgeInfo[] {
  // TikTok sometimes puts these in `payload.data.userDetails` or directly in `user` or `payload.data`
  const targetUser = user || userDetails || {};
  if (!targetUser) return [];
  
  const badges: BadgeInfo[] = [];

  // 1. Pay grade / Wealth level
  const wealthLevel = targetUser.payGrade?.level || targetUser.pay_grade?.level || targetUser.payGradeLevel;
  if (wealthLevel > 0) {
    badges.push({
      type: "wealth",
      name: "", // Usually no name, just the number
      level: wealthLevel,
      color: wealthLevel > 30 ? "bg-indigo-500" : "bg-[#4B6EEF]" // Default tiktok blue
    });
  }

  // 2. Fans club / Fan badge
  const fansLevel = targetUser.fansClub?.data?.level || targetUser.fans_club?.data?.level || targetUser.fansLevel;
  const fansName = targetUser.fansClub?.data?.clubName || targetUser.fans_club?.data?.club_name || targetUser.fansName;
  if (fansLevel > 0 && fansName) {
    badges.push({
      type: "fans",
      name: fansName,
      level: fansLevel,
      color: "bg-[#FF5A50]" // TikTok standard fan badge red/orange
    });
  }

  // 3. Subscriber / Member
  // Often inside badgeList
  
  // 4. Fallback to checking badgeList directly if specific objects are missing
  const badgeList = targetUser.badgeList || targetUser.badge_list || [];
  if (Array.isArray(badgeList)) {
    for (const b of badgeList) {
       // displayType 1 often denotes an image or custom badge
       if (b.displayType === 1 && (b.image?.urlList?.[0] || b.icon?.urlList?.[0] || b.urlList?.[0])) {
         badges.push({
           type: "icon",
           name: b.name || b.title || "Badge",
           url: b.image?.urlList?.[0] || b.icon?.urlList?.[0] || b.urlList?.[0],
           color: "bg-transparent shadow-none px-0"
         });
       } else if (b.name && b.level) {
          // generic badge parsing
          // Ensure we don't duplicate fans/wealth if they are also in the badge list
          if (!badges.some(existing => existing.name === b.name || existing.type === "generic")) {
             badges.push({
                type: "generic",
                name: b.name,
                level: b.level,
                color: "bg-zinc-500"
             });
          }
       }
    }
  }

  // 5. Moderator Badge
  const userAttr = targetUser.userAttr || targetUser.user_attr || {};
  if (userAttr?.isAdmin || userAttr?.is_admin || targetUser.isAdmin) {
    badges.push({
       type: "admin",
       name: "Mod",
       color: "bg-[#00F2FE]"
    });
  }

  return badges;
}

let messageCounter = 0;

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++messageCounter}`;
}

// Map custom text emojis from TikTok to standard unicode emojis as fallback
const textEmojiMap: Record<string, string> = {
  "[smile]": "🙂",
  "[happy]": "😀",
  "[angry]": "😠",
  "[cry]": "😢",
  "[embarrassed]": "😳",
  "[surprised]": "😮",
  "[wronged]": "🥺",
  "[shout]": "📢",
  "[flushed]": "😳",
  "[yummy]": "😋",
  "[complacent]": "😌",
  "[drool]": "🤤",
  "[scream]": "😱",
  "[weep]": "😭",
  "[speechless]": "😶",
  "[funnyface]": "🤪",
  "[laughwithtears]": "😂",
  "[laughcry]": "😂",
  "[joyful]": "😊",
  "[facewithrollingeyes]": "🙄",
  "[sulk]": "😒",
  "[thinking]": "🤔",
  "[lovely]": "😍",
  "[greedy]": "🤑",
  "[wow]": "🤩",
  "[proud]": "😎",
  "[smileface]": "😇",
  "[stunned]": "😲",
  "[dizzy]": "😵",
  "[applause]": "👏",
  "[slap]": "🤦",
  "[tears]": "🥲",
  "[kiss]": "😘",
  "[kissface]": "😗",
  "[facewithheartseyes]": "😍",
  "[hi]": "👋",
  "[bye]": "👋",
  "[hello]": "👋",
  "[hehe]": "😁",
  "[haha]": "😆",
  "[oh]": "😯",
  "[ok]": "👌",
  "[love]": "❤️",
  "[heart]": "❤️",
  "[like]": "👍",
  "[dislike]": "👎",
  "[thanks]": "🙏",
  "[thankyou]": "🙏",
  "[cool]": "😎",
  "[omg]": "😱",
  "[yes]": "✅",
  "[no]": "❌",
  "[lol]": "😂",
  "[lmao]": "🤣",
  "[sad]": "😞",
  "[sweat]": "😓",
  "[sleep]": "😴",
  "[fire]": "🔥",
  "[star]": "⭐",
  "[flower]": "🌹",
  "[rose]": "🌹",
  "[100]": "💯",
  "[party]": "🎉",
  "[celebrate]": "🥳",
  "[gift]": "🎁",
  "[cake]": "🎂",
  "[coffee]": "☕",
  "[music]": "🎵",
  "[dance]": "💃",
  "[pray]": "🙏",
  "[peace]": "✌️",
  "[v]": "✌️",
};

// Replace text emojis like [laughcry] with standard emojis, handles images if emotes array passed
function renderMessageContent(text: string, emotes?: { placeInComment: number; emoteImageUrl: string }[]) {
  if (!text) return null;
  
  let parts: React.ReactNode[] = [];
  
  // If we have proper image emotes from tiktok payload
  if (emotes && emotes.length > 0) {
    let lastIndex = 0;
    
    // TikTok provides emotes with 'placeInComment' which is the character index
    // We sort them by position just in case
    const sortedEmotes = [...emotes].sort((a, b) => a.placeInComment - b.placeInComment);
    
    sortedEmotes.forEach((emote, index) => {
       // Extract text before this emote
       const beforeText = text.substring(lastIndex, emote.placeInComment);
       if (beforeText) {
          // Parse standard text emojis in the preceding text
          const parsed = beforeText.replace(/\[.*?\]/gi, (match) => {
             return textEmojiMap[match.toLowerCase()] || match;
          });
          parts.push(<span key={`t-${index}`}>{parsed}</span>);
       }
       
       // Add the emote image itself
       parts.push(
         <img key={`e-${index}`} src={emote.emoteImageUrl} alt="emote" className="w-5 h-5 inline-block align-middle mx-0.5" />
       );
       
       // Update lastIndex (tiktok emote strings are typically like "[emoji_name]")
       // We try to find the closing bracket to know where the text continues
       const closeBracket = text.indexOf(']', emote.placeInComment);
       lastIndex = closeBracket !== -1 ? closeBracket + 1 : emote.placeInComment + 1;
    });
    
    // Add any remaining text
    if (lastIndex < text.length) {
       const remainingText = text.substring(lastIndex);
       const parsed = remainingText.replace(/\[.*?\]/gi, (match) => {
          return textEmojiMap[match.toLowerCase()] || match;
       });
       parts.push(<span key="t-end">{parsed}</span>);
    }
    
    return <span className="inline-block align-middle">{parts}</span>;
  }

  // Fallback to purely text-based emoji mapping
  return text.replace(/\[.*?\]/gi, (match) => {
    return textEmojiMap[match.toLowerCase()] || match;
  });
}

export function LiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { activeUsername, incrementStats, setProfileImage, setStats, setStatus, status, setStreamerDetails, setStreamUrl, setLastGift, setLastLike, setBattleOpponents } = useTikTokLive();
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

        if (payload.type === "connected" || payload.type === "stream_url") {
          settled = true;
          setIsConnected(true);
          setStatus("live");
          
          if (payload.roomInfo?.avatarUrl) setProfileImage(payload.roomInfo.avatarUrl);
          
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
          
          if (payload.type === "connected") {
            setMessages(prev => [...prev, {
              id: uniqueId("sys-conn"),
              type: "system",
              username: "System",
              message: `Connected to @${activeUsername}'s live stream.`,
              timestamp: Date.now(),
            } as ChatMessage]);
          }
        }

        if (payload.type === "disconnected" || payload.type === "stream_end") {
          setBattleOpponents([]);
        }

        if (payload.type === "stream_end") {
          // If the stream ends unexpectedly (often happens during PK battles/transitions),
          // auto-reconnect instead of immediately throwing the user out.
          window.dispatchEvent(new CustomEvent('tiktok-reconnect', { detail: { username: activeUsername } }));
        }

        if (payload.type === "disconnected") {
          settled = true;
          setIsConnected(false);
          setStatus("offline");
          setMessages([]);
          setStreamUrl({});
          eventSource.close();
        }

        if (payload.type === "stats" && payload.data) {
          const { giftsIncrement, followersIncrement, sharesIncrement, likesIncrement, ...latestStats } = payload.data;
          
          if (Object.keys(latestStats).length > 0) {
            setStats(latestStats as any);
          }
          
          incrementStats({
            gifts: giftsIncrement,
            followers: followersIncrement,
            shares: sharesIncrement,
            likes: likesIncrement,
          });
          
          if (likesIncrement && likesIncrement > 0 && payload.data?.likeSender) {
             const user = payload.data.likeSender;
             const username = user?.displayId || user?.nickname || "Someone";
             setTimeout(() => {
                setLastLike({ 
                  username, 
                  count: likesIncrement, 
                  id: `like-${Date.now()}-${Math.random()}` 
                });
             }, 0);
          }
        }

        if (payload.type === "battle" && Array.isArray(payload.data)) {
           // Parse PK opponents (link mic)
           const opponents = payload.data
             .map((item: any) => item.user || item.userProfile || item) // Handle potential nesting
             .filter((u: any) => {
                const uid = u.displayId || u.uniqueId || u.display_id || u.unique_id;
                return uid && uid !== activeUsername;
             })
             .map((u: any) => ({
                username: u.displayId || u.uniqueId || u.display_id || u.unique_id || u.nickname,
                avatarUrl: u.avatarThumb?.urlList?.[0] || u.avatar_thumb?.url_list?.[0] || u.avatarMedium?.urlList?.[0] || u.avatar_url,
                nickname: u.nickname
             }));
           
           if (opponents.length > 0) {
              setBattleOpponents(opponents);
           } else {
              setBattleOpponents([]); // Battle ended or self
           }
        }

        if (payload.type === "chat" && payload.data) {
          setMessages(prev => {
            const user = payload.data?.user;
            const updated = [...prev, {
              id: payload.data?.common?.msgId ? `chat-${payload.data.common.msgId}-${Date.now()}` : uniqueId("chat"),
              type: "chat",
              username: user?.displayId || user?.nickname || payload.data?.uniqueId || "User",
              message: payload.data?.content || payload.data?.comment || "",
              avatarUrl: user?.avatarThumb?.urlList?.[0] || payload.data?.profilePictureUrl,
              badges: extractBadges(user, payload.data),
              emotes: payload.data?.emotes,
              timestamp: Date.now(),
            } as ChatMessage];
            return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
          });
        }

        if (payload.type === "gift" && payload.data) {
          setMessages(prev => {
            const user = payload.data?.user;
            const giftName = payload.data?.gift?.name || payload.data?.giftName || "a gift";
            const giftCount = payload.data?.comboCount || payload.data?.repeatCount || 1;
            const avatar = user?.avatarThumb?.urlList?.[0] || payload.data?.profilePictureUrl;
            const icon = payload.data?.gift?.image?.urlList?.[0] || payload.data?.gift?.icon?.urlList?.[0] || payload.data?.giftPictureUrl;
            const username = user?.displayId || user?.nickname || payload.data?.uniqueId || "User";
            const id = payload.data?.common?.msgId ? `gift-${payload.data.common.msgId}-${Date.now()}` : uniqueId("gift");
            
            // Trigger the overlay alert asynchronously to avoid update-during-render warning
            setTimeout(() => {
               setLastGift({ username, avatarUrl: avatar, giftName, giftIcon: icon, count: giftCount, id });
            }, 0);

            const updated = [...prev, {
              id,
              type: "gift",
              username,
              message: `Sent ${giftName} x${giftCount}`,
              avatarUrl: avatar,
              giftName: giftName,
              giftCount: giftCount,
              giftIcon: icon,
              badges: extractBadges(user, payload.data),
              timestamp: Date.now(),
            } as ChatMessage];
            return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
          });
        }

        if (payload.type === "error") {
          settled = true;
          if (payload.message && typeof payload.message === 'string' && (payload.message.includes('expired') || payload.message.includes('revoked'))) {
             // Handle expired stream url gracefully by closing connection but not clearing messages immediately
             eventSource.close();
             setIsConnected(false);
             window.dispatchEvent(new CustomEvent('tiktok-reconnect', { detail: { username: activeUsername } }));
          } else {
            // Keep messages visible even on error to prevent layout jump and preserve history
            // setMessages([]); 
            setIsConnected(false);
            setStatus("offline");
            setStreamUrl({});
            eventSource.close();
          }
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

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap leading-none mb-0.5">
                {msg.badges && msg.badges.map((badge, i) => (
                  <span 
                    key={i} 
                    className={`inline-flex items-center text-[10px] font-bold px-1 py-0.5 rounded shadow-sm text-white leading-none tracking-tight shrink-0 ${badge.color || 'bg-zinc-700'}`}
                  >
                    {badge.type === 'wealth' && <span className="mr-0.5" style={{ fontSize: '9px'}}>💎</span>}
                    {badge.type === 'fans' && <span className="mr-0.5" style={{ fontSize: '9px'}}>❤️</span>}
                    {badge.type === 'admin' && <span className="mr-0.5" style={{ fontSize: '9px'}}>🛡️</span>}
                    {badge.url && <img src={badge.url} alt={badge.name} className="w-3 h-3 mr-0.5 inline-block object-contain" />}
                    <span>{badge.name} {badge.level ? `${badge.type === 'wealth' ? badge.level : (badge.type === 'fans' ? badge.level : 'Lv.' + badge.level)}` : ''}</span>
                  </span>
                ))}
                <span className={`text-xs font-semibold shrink-0 ${msg.type === 'system' ? 'text-zinc-400' : 'text-zinc-300'}`}>
                  {msg.username}
                </span>
              </div>
              <span className={`text-sm break-words ${msg.type === 'gift' ? 'text-[#FF0050] font-medium flex items-center gap-1' : 'text-white'}`}>
                {msg.type === 'chat' ? renderMessageContent(msg.message, msg.emotes) : msg.message}
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
