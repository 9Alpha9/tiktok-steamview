"use client";

import { Circle, MessageSquareText, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTikTokLive } from "./TikTokLiveProvider";
import { useEffect, useState, useRef, useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";

interface ChatEvent {
  type: "chat" | "gift" | "connected" | "disconnected" | "error" | "stream_end" | "stats" | "battle" | "battle_update" | "stream_url" | "goal" | "rank_update" | "rank_text" | "poll" | "caption" | "super_fan" | "envelope" | "question";
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
  const { activeUsername, incrementStats, setProfileImage, setStats, setStatus, status, setStreamerDetails, setStreamUrl, setLastGift, setLastLike, setBattleOpponents, setGoal, addContribution, setRanks, setPolls, setCaptions, setSuperFans, setEnvelopes, setQuestions, recentActivity, setRecentActivity } = useTikTokLive();
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
    let reconnecting = false;

    const connectEventSource = () => {
      if (reconnecting) return;
      
      const eventSource = new EventSource(`/api/tiktok?username=${encodeURIComponent(activeUsername)}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const payload: ChatEvent = JSON.parse(event.data);

          if (payload.type === "disconnected" || payload.type === "stream_end") {
            setBattleOpponents([]);
            setGoal(null);
          }

          if (payload.type === "stream_end") {
            window.dispatchEvent(new CustomEvent('tiktok-reconnect', { detail: { username: activeUsername } }));
          }

          if (payload.type === "disconnected") {
            settled = true;
            setIsConnected(false);
            setStatus("offline");
            setMessages([]);
            setStreamUrl({});
            eventSource.close();
            
            // Reconnect aggressively if standard disconnect (often Vercel timeout)
            if (!reconnecting) {
               reconnecting = true;
               reconnectTimerRef.current = setTimeout(() => {
                 reconnecting = false;
                 connectEventSource();
               }, 1500);
            }
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
                setBattleOpponents([]); 
             }
          }

          if (payload.type === "goal" && payload.data) {
            const g = payload.data;
            const subGoals = (g.subGoals || []).map((sg: any) => ({
              id: sg.idStr || sg.id || "",
              type: sg.type || 0,
              progress: Number(sg.progress) || 0,
              target: Number(sg.target) || 0,
              giftName: sg.gift?.name || sg.recommendedText || "",
              giftIcon: sg.gift?.icon?.url_list?.[0] || sg.gift?.icon?.urlList?.[0] || "",
              diamondCount: Number(sg.gift?.diamondCount) || 0,
            }));
            const contributors = (g.contributors || []).map((c: any) => ({
              userId: c.userIdStr || c.userId || "",
              displayId: c.displayId || "",
              avatarUrl: c.avatar?.url_list?.[0] || c.avatar?.urlList?.[0] || "",
              score: Number(c.score) || 0,
            }));
            setGoal({
              id: g.idStr || g.id || "",
              description: g.description || "",
              status: g.status || 0,
              challengeType: g.challengeType || "",
              subGoals,
              contributors,
              stats: {
                totalCoins: Number(g.stats?.totalCoins) || 0,
                totalContributor: Number(g.stats?.totalContributor) || 0,
              },
            });
          }

          // Rank Update — top gifter leaderboard
          if (payload.type === "rank_update" && payload.data) {
            const ranksData = payload.data?.rankings || payload.data?.rankList || [];
            if (Array.isArray(ranksData)) {
              const parsed = ranksData.map((r: any, i: number) => ({
                rank: r.rank || i + 1,
                username: r.user?.displayId || r.user?.uniqueId || r.user?.nickname || "",
                avatarUrl: r.user?.avatarThumb?.urlList?.[0] || r.user?.avatar_thumb?.url_list?.[0] || "",
                score: Number(r.score) || 0,
                nickname: r.user?.nickname || "",
              }));
              setRanks(parsed);
            }
          }

          // Rank Text — rank change notification (add to activity)
          if (payload.type === "rank_text" && payload.data) {
            const user = payload.data?.user;
            if (user) {
              const username = user.displayId || user.uniqueId || user.nickname || "";
              const rank = payload.data?.rank || 0;
              setRecentActivity(prev => {
                const event = {
                  id: `rank-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  type: "gift" as const,
                  username,
                  avatarUrl: user.avatarThumb?.urlList?.[0] || "",
                  detail: `Reached rank #${rank}`,
                  timestamp: Date.now(),
                };
                return [event, ...prev].slice(0, 30);
              });
            }
          }

          // Poll — creator-launched polls
          if (payload.type === "poll" && payload.data) {
            const p = payload.data;
            const pollData = {
              id: p.idStr || p.id || `poll-${Date.now()}`,
              question: p.question || "",
              options: (p.options || []).map((o: any) => ({
                id: o.idStr || o.id || "",
                text: o.text || "",
                voteCount: Number(o.voteCount) || 0,
                votePercentage: Number(o.votePercentage) || 0,
              })),
              status: p.status || "active",
              startTime: Number(p.startTime) || Date.now(),
              endTime: Number(p.endTime) || Date.now() + 60000,
            };
            setPolls(prev => {
              const existing = prev.findIndex(x => x.id === pollData.id);
              if (existing >= 0) {
                return prev.map((x, i) => i === existing ? pollData : x);
              }
              return [pollData, ...prev].slice(0, 5);
            });
          }

          // Caption — auto-captions from streamer audio
          if (payload.type === "caption" && payload.data) {
            const text = payload.data?.text || payload.data?.caption || "";
            if (text) {
              setCaptions(prev => {
                const newCaption = { text, timestamp: Date.now() };
                return [newCaption, ...prev].slice(0, 20);
              });
            }
          }

          // Super Fan — viewer becomes super fan
          if (payload.type === "super_fan" && payload.data) {
            const user = payload.data?.user;
            if (user) {
              const fanData = {
                username: user.displayId || user.uniqueId || user.nickname || "",
                avatarUrl: user.avatarThumb?.urlList?.[0] || "",
                nickname: user.nickname || "",
                timestamp: Date.now(),
              };
              setSuperFans(prev => [fanData, ...prev].slice(0, 20));
              setRecentActivity(prev => {
                const event = {
                  id: `sf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  type: "super_fan" as const,
                  username: fanData.username,
                  avatarUrl: fanData.avatarUrl,
                  detail: "Became a Super Fan",
                  timestamp: Date.now(),
                };
                return [event, ...prev].slice(0, 30);
              });
            }
          }

          // Envelope — treasure chest / amplop
          if (payload.type === "envelope" && payload.data) {
            const envData = {
              id: payload.data?.idStr || payload.data?.id || `env-${Date.now()}`,
              senderName: payload.data?.senderName || payload.data?.user?.displayId || "",
              senderAvatar: payload.data?.senderAvatar || payload.data?.user?.avatarThumb?.urlList?.[0] || "",
              diamondCount: Number(payload.data?.diamondCount) || 0,
              timestamp: Date.now(),
            };
            setEnvelopes(prev => [envData, ...prev].slice(0, 10));
            setRecentActivity(prev => {
              const event = {
                id: `env-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: "envelope" as const,
                username: envData.senderName,
                avatarUrl: envData.senderAvatar,
                detail: `Sent envelope (${envData.diamondCount} diamonds)`,
                timestamp: Date.now(),
              };
              return [event, ...prev].slice(0, 30);
            });
          }

          // Question — audience Q&A
          if (payload.type === "question" && payload.data) {
            const user = payload.data?.user;
            if (user) {
              const qData = {
                id: payload.data?.idStr || payload.data?.id || `q-${Date.now()}`,
                username: user.displayId || user.uniqueId || user.nickname || "",
                avatarUrl: user.avatarThumb?.urlList?.[0] || "",
                text: payload.data?.question || payload.data?.text || "",
                timestamp: Date.now(),
              };
              setQuestions(prev => [qData, ...prev].slice(0, 20));
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
            const user = payload.data?.user;
            const giftName = payload.data?.gift?.name || payload.data?.giftName || "a gift";
            const giftCount = payload.data?.comboCount || payload.data?.repeatCount || 1;
            const avatar = user?.avatarThumb?.urlList?.[0] || payload.data?.profilePictureUrl;
            const icon = payload.data?.gift?.image?.urlList?.[0] || payload.data?.gift?.icon?.urlList?.[0] || payload.data?.giftPictureUrl;
            const username = user?.displayId || user?.nickname || payload.data?.uniqueId || "User";
            const id = payload.data?.common?.msgId ? `gift-${payload.data.common.msgId}-${Date.now()}` : uniqueId("gift");
            const diamondCount = payload.data?.gift?.diamondCount || payload.data?.gift?.diamond_count || 0;

            setTimeout(() => {
              setLastGift({ username, avatarUrl: avatar, giftName, giftIcon: icon, count: giftCount, id, diamondCount: diamondCount * giftCount });
              addContribution(username, avatar || "", giftName, giftCount, diamondCount * giftCount);
            }, 0);

            setMessages(prev => {
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

          if (payload.type === "error") {
            settled = true;
            if (payload.message && typeof payload.message === 'string' && (payload.message.includes('expired') || payload.message.includes('revoked'))) {
               eventSource.close();
               setIsConnected(false);
               window.dispatchEvent(new CustomEvent('tiktok-reconnect', { detail: { username: activeUsername } }));
            } else {
              setIsConnected(false);
              eventSource.close();
              
              if (!reconnecting) {
                 reconnecting = true;
                 reconnectTimerRef.current = setTimeout(() => {
                   reconnecting = false;
                   connectEventSource();
                 }, 3000);
              }
            }
          }
        } catch (err) {
          console.error("Failed to parse SSE message", err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsConnected(false);
        if (!reconnecting) {
           reconnecting = true;
           reconnectTimerRef.current = setTimeout(() => {
             reconnecting = false;
             connectEventSource();
           }, 1000); // Fast 1-second reconnect for Vercel idle timeouts
        }
      };
    };

    connectEventSource();

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
