"use client";

import {
  ExternalLink,
  Heart,
  Maximize2,
  Pause,
  Play,
  Search,
  Volume2,
  VolumeX,
  Eye
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTikTokLive } from "./TikTokLiveProvider";
import { Avatar } from "@/components/ui/Avatar";
import { AnimatePresence, motion } from "framer-motion";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function StreamPlayer() {
  const { activeUsername, setActiveUsername, streamUrl, streamerInfo, stats, status, lastGift, lastLike, battleOpponents } = useTikTokLive();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [objectFit, setObjectFit] = useState<"contain" | "cover">("contain");

  const [showOverlay, setShowOverlay] = useState(true);
  const [streamStartTime, setStreamStartTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [streamTimeout, setStreamTimeout] = useState(false);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hlsUrl = streamUrl?.hls;
  const coverUrl = streamUrl?.cover;

  const flvUrl = streamUrl?.flv;

  useEffect(() => {
    if (activeUsername) {
      setStreamStartTime(Date.now());
      setElapsed(0);
      setVideoError(false);
      setStreamTimeout(false);
      setIsMuted(true);
      
      // If we don't get an HLS URL within 15 seconds, show a fallback UI instead of infinite loading
      if (streamWaitTimerRef.current) clearTimeout(streamWaitTimerRef.current);
      streamWaitTimerRef.current = setTimeout(() => {
         setStreamTimeout(true);
      }, 15000);
    }
  }, [activeUsername]);

  useEffect(() => {
    if (hlsUrl) {
       setStreamTimeout(false);
       if (streamWaitTimerRef.current) clearTimeout(streamWaitTimerRef.current);
    }
  }, [hlsUrl]);

  useEffect(() => {
    if (!activeUsername) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - streamStartTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [streamStartTime, activeUsername]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) {
       // If no HLS but we have FLV, the current player only supports HLS.
       // It will fail gracefully.
       if (!hlsUrl && flvUrl && !videoError) {
          console.warn("Only FLV URL found, but FLV playback is not implemented in this player.");
          setVideoError(true);
       }
       return;
    }

    setVideoError(false);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // Turned off to prevent audio/video desync
        liveSyncDurationCount: 3, // Maintain a 3-segment buffer to ensure video catches up to audio
        liveMaxLatencyDurationCount: 10,
        backBufferLength: 90,
        xhrSetup: function (xhr) {
          // TikTok CDN sometimes requires specific headers to bypass 403 on some networks
          xhr.setRequestHeader('Accept', '*/*');
        }
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => { });
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          // If network error (403 or anything else that is fatal like stream ending mid-way)
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR || data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              setVideoError(true);
              hls.destroy();
              hlsRef.current = null;
              // Auto-refresh the stream gracefully when it drops/expires
              setTimeout(() => {
                 window.dispatchEvent(new CustomEvent('tiktok-reconnect', { detail: { username: activeUsername } }));
              }, 1000);
          } else {
             setVideoError(true);
          }
        }
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => { });
      });
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }
  }, [hlsUrl]);

  useEffect(() => {
    if (!activeUsername) return;

    const handlePlayerEvent = (event: MessageEvent) => {
      if (event.origin !== "https://www.tiktok.com" || !event.data || event.data["x-tiktok-player"] !== true) return;
      if (event.data.type === "onPlayerError") {
        setVideoError(true);
      }
    };

    window.addEventListener("message", handlePlayerEvent);
    return () => window.removeEventListener("message", handlePlayerEvent);
  }, [activeUsername]);

  useEffect(() => {
    if (videoRef.current) {
      const handleResize = () => {
         const video = videoRef.current;
         if (!video) return;
         // Detect if video is landscape/multi-guest (width > height)
         if (video.videoWidth > video.videoHeight) {
            setObjectFit("contain"); // Ensure landscape fits within the container horizontally
         } else {
            // Default to contain for normal portrait too
            setObjectFit("contain"); 
         }
      };
      
      videoRef.current.addEventListener('loadedmetadata', handleResize);
      return () => videoRef.current?.removeEventListener('loadedmetadata', handleResize);
    }
  }, [hlsUrl, activeUsername]);

  const handleRefreshStream = useCallback(() => {
    // Force reconnect to TikTok live stream to get a fresh URL
    const currentUsername = activeUsername;
    if (currentUsername) {
      setVideoError(false);
      // Trigger a reconnect by toggling the username or utilizing the provider's logic
      // This is a simplified way to trigger a re-fetch of the stream URL
      window.dispatchEvent(new CustomEvent('tiktok-reconnect', { detail: { username: currentUsername } }));
    }
  }, [activeUsername]);

  const resetOverlayTimer = useCallback(() => {
    setShowOverlay(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setShowOverlay(false), 4000);
  }, []);

  useEffect(() => {
    resetOverlayTimer();
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [activeUsername, resetOverlayTimer]);

  const handleMouseMove = useCallback(() => {
    resetOverlayTimer();
  }, [resetOverlayTimer]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => { });
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const openTikTok = useCallback(() => {
    window.open(`https://www.tiktok.com/@${activeUsername}/live`, "_blank", "noopener,noreferrer");
  }, [activeUsername]);

  return (
    <Card className="flex flex-col h-full bg-[#11131A] border-border/50 overflow-hidden relative">
      {/* Video Area */}
      <div
        className="relative flex-1 bg-[#0e1015] flex items-center justify-center overflow-hidden min-h-0"
        onMouseMove={handleMouseMove}
      >
        {/* Like Overlay Animation — Floating Hearts TikTok Style */}
        {lastLike && activeUsername && (
          <div className="absolute bottom-16 right-4 z-30 pointer-events-none w-8 h-40">
            {Array.from({ length: Math.min(lastLike.count, 15) }).map((_, i) => {
              const delay = i * 0.08;
              const size = 18 + Math.random() * 8;
              const xDrift = -6 + Math.random() * 12;
              const yHeight = 100 + Math.random() * 60;
              const rotate = -15 + Math.random() * 30;
              return (
                <motion.div
                  key={`heart-${lastLike.id}-${i}`}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2"
                  initial={{ opacity: 1, y: 0, x: 0, scale: 0.2, rotate: 0 }}
                  animate={{
                    opacity: [1, 1, 0.8, 0],
                    y: -yHeight,
                    x: [0, xDrift * 0.3, xDrift],
                    scale: [0.2, 0.9, 1, 0.6],
                    rotate: [0, rotate * 0.5, rotate],
                  }}
                  transition={{
                    duration: 1.6,
                    delay,
                    ease: [0.1, 0.7, 0.3, 1],
                    opacity: { times: [0, 0.3, 0.7, 1] },
                    scale: { times: [0, 0.2, 0.6, 1] },
                  }}
                  style={{ fontSize: `${size}px`, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}
                >
                  ❤️
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Gift Overlay Animation — Small Notification (Regular Gifts) */}
        <AnimatePresence>
          {lastGift && activeUsername && lastGift.diamondCount < 100 && (
             <motion.div
               key={lastGift.id}
               initial={{ opacity: 0, x: -50, scale: 0.9 }}
               animate={{ opacity: 1, x: 0, scale: 1 }}
               exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
               className="absolute top-16 left-3 z-40 flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full pr-4 p-1 border border-white/10"
               style={{ maxWidth: '80%' }}
             >
               <Avatar src={lastGift.avatarUrl} alt={lastGift.username} size="sm" fallback={lastGift.username[0]} className="w-8 h-8 shrink-0 border border-white/10" />
               <div className="flex flex-col justify-center min-w-0 pr-2">
                 <span className="text-[11px] font-bold text-white truncate leading-tight">{lastGift.username}</span>
                 <span className="text-[10px] font-medium text-amber-300 truncate leading-tight">Sent {lastGift.giftName}</span>
               </div>
               {lastGift.giftIcon && (
                 <motion.img 
                   src={lastGift.giftIcon} 
                   alt={lastGift.giftName} 
                   className="w-10 h-10 object-contain ml-1 drop-shadow-lg"
                   initial={{ scale: 0.5, rotate: -20 }}
                   animate={{ scale: 1, rotate: 0 }}
                   transition={{ duration: 0.5, type: 'spring', bounce: 0.5 }}
                 />
               )}
               {lastGift.count > 1 && (
                  <motion.span 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-[#FF0050] font-black text-xl italic ml-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  >
                    x{lastGift.count}
                  </motion.span>
               )}
             </motion.div>
          )}
        </AnimatePresence>

        {/* Gift Overlay Animation — Big Center Celebration (Expensive Gifts) */}
        <AnimatePresence>
          {lastGift && activeUsername && lastGift.diamondCount >= 100 && (
             <motion.div
               key={`big-${lastGift.id}`}
               initial={{ opacity: 0, scale: 0.3, y: 50 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.5, y: -30, transition: { duration: 0.5 } }}
               className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
             >
               {/* Glow background */}
               <motion.div 
                 className="absolute inset-0"
                 style={{ background: 'radial-gradient(circle at center, rgba(251,191,36,0.2) 0%, transparent 70%)' }}
                 initial={{ opacity: 0 }}
                 animate={{ opacity: [0, 0.6, 0.3] }}
                 transition={{ duration: 1.5 }}
               />
               
               {/* Gift icon big */}
               {lastGift.giftIcon && (
                 <motion.img 
                   src={lastGift.giftIcon} 
                   alt={lastGift.giftName} 
                   className="w-24 h-24 object-contain drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]"
                   initial={{ scale: 0, rotate: -30, y: 30 }}
                   animate={{ scale: [0, 1.3, 1], rotate: [-30, 10, 0], y: [30, -10, 0] }}
                   transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
                 />
               )}
               
               {/* Gift name */}
               <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3, duration: 0.4 }}
                 className="mt-3 text-center"
               >
                 <span className="text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                   {lastGift.giftName}
                 </span>
                 {lastGift.count > 1 && (
                   <span className="text-amber-400 font-black text-3xl ml-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                     x{lastGift.count}
                   </span>
                 )}
               </motion.div>
               
               {/* Sender */}
               <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.5, duration: 0.4 }}
                 className="mt-2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5"
               >
                 <Avatar src={lastGift.avatarUrl} alt={lastGift.username} size="sm" fallback={lastGift.username[0]} className="w-6 h-6 border border-amber-400/50" />
                 <span className="text-sm font-semibold text-amber-200">{lastGift.username}</span>
               </motion.div>

               {/* Particle sparkles */}
               {Array.from({ length: 8 }).map((_, i) => {
                 const angle = (i / 8) * Math.PI * 2;
                 const dist = 60 + Math.random() * 40;
                 return (
                   <motion.div
                     key={`sparkle-${lastGift.id}-${i}`}
                     className="absolute w-2 h-2 rounded-full bg-amber-400"
                     initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                     animate={{
                       opacity: [0, 1, 0],
                       x: Math.cos(angle) * dist,
                       y: Math.sin(angle) * dist,
                       scale: [0, 1.5, 0],
                     }}
                     transition={{ duration: 1, delay: 0.2 + i * 0.05, ease: 'easeOut' }}
                   />
                 );
               })}
             </motion.div>
          )}
        </AnimatePresence>

        {/* PK Battle Opponents Layer (Modern TikTok Style Top Bar) */}
        {battleOpponents && battleOpponents.length > 0 && activeUsername && hlsUrl && !videoError && (
          <div className="absolute inset-x-0 top-0 pt-12 pb-2 px-3 pointer-events-none z-10 flex flex-col gap-2">
             {/* Battle Indicator / Health bar placeholder */}
             <div className="w-full flex items-center justify-between opacity-90 drop-shadow-md px-1">
               <div className="flex -space-x-2">
                  <Avatar src={streamerInfo?.avatar} alt={activeUsername} fallback={activeUsername[0]} size="sm" className="w-7 h-7 border-2 border-[#FF0050] z-20" />
               </div>
               <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                  <span className="text-[10px] font-bold text-[#FF0050] tracking-wider">PK</span>
                  <span className="text-[9px] font-medium text-white/80">MATCH</span>
               </div>
               <div className="flex flex-row-reverse -space-x-2 space-x-reverse">
                  {battleOpponents.slice(0, 3).map((opp, idx) => (
                    <Avatar key={idx} src={opp.avatarUrl} alt={opp.username} fallback={opp.username?.[0]} size="sm" className="w-7 h-7 border-2 border-[#00F2FE]" style={{ zIndex: 10 - idx }} />
                  ))}
               </div>
             </div>

             {/* Detailed User Labels (VS) */}
             <div className="flex gap-2 w-full mt-1 justify-between px-1">
               {/* Main Host Label */}
               <div className="bg-black/60 backdrop-blur-sm rounded-full pr-3 pl-1 py-1 flex items-center gap-2 border border-white/10 pointer-events-auto shrink-0">
                  <Avatar src={streamerInfo?.avatar} alt={activeUsername} fallback={activeUsername[0]} size="sm" className="w-5 h-5 border border-white/20" />
                  <span className="text-[10px] text-white font-medium leading-none truncate max-w-[70px]">{streamerInfo?.nickname || activeUsername}</span>
               </div>
               
               {/* Opponents Label */}
               <div className="flex gap-2 justify-end">
                 {battleOpponents.slice(0, 3).map((opponent, idx) => (
                   <div key={idx} className="bg-black/60 backdrop-blur-sm rounded-full pr-3 pl-1 py-1 flex items-center gap-2 border border-white/10 pointer-events-auto shrink-0">
                      <Avatar src={opponent.avatarUrl} alt={opponent.username} fallback={opponent.username?.[0]} size="sm" className="w-5 h-5 border border-white/20" />
                      <span className="text-[10px] text-white font-medium leading-none truncate max-w-[70px]">{opponent.nickname || opponent.username}</span>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}

        {/* LIVE + Viewers Badge (top-left) */}
        {activeUsername && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            {status === "live" && (
              <div className="flex items-center gap-1.5 bg-[#FF0050]/90 backdrop-blur-sm px-2 py-1 rounded">
                <span className="text-[11px] font-bold text-white uppercase tracking-wide">LIVE</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="text-xs font-medium text-white">{formatViewers(stats.viewers)}</span>
            </div>
          </div>
        )}

        {/* Video element for HLS playback */}
        {activeUsername && hlsUrl && (
          <video
            ref={videoRef}
            className={`h-full w-full relative z-10 transition-all duration-300 ${objectFit === 'cover' ? 'object-cover' : 'object-contain'}`}
            playsInline
            muted
            autoPlay
          />
        )}

        {/* Cover / Fallback when no HLS URL yet */}
        {activeUsername && !hlsUrl && !videoError && (
          <div className="flex flex-col items-center gap-4 text-center p-6 z-10 w-full">
            {coverUrl ? (
              <div className="relative w-full max-w-[480px] aspect-video rounded-lg overflow-hidden bg-[#1f2230]">
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  {streamTimeout ? (
                     <div className="flex flex-col items-center gap-3">
                       <div className="flex items-center justify-center w-12 h-12 bg-white/5 rounded-full mb-1">
                          <Eye className="w-5 h-5 text-text-muted" />
                       </div>
                       <p className="text-sm font-medium text-white mb-0.5">Stream Video Restricted</p>
                       <p className="text-xs text-text-muted max-w-[85%] mx-auto text-center leading-relaxed">
                         TikTok has hidden the video feed for this specific broadcast. It might be <b>Age Restricted (18+)</b>, geo-blocked, or requires a logged-in mobile app.
                       </p>
                       <p className="text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-2 py-1 rounded">Live chat is still connected</p>
                       <div className="flex gap-2 mt-2 w-full justify-center">
                         <Button onClick={handleRefreshStream} className="h-8 text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10">Retry</Button>
                         <Button onClick={openTikTok} className="h-8 text-xs bg-[#FF0050] hover:bg-[#FF0050]/90 text-white font-semibold flex items-center gap-1.5 px-4">
                           Open App <ExternalLink className="w-3 h-3" />
                         </Button>
                       </div>
                     </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-white/80">Connecting to stream&hellip;</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {streamTimeout ? (
                     <div className="flex flex-col items-center gap-3">
                       <div className="flex items-center justify-center w-12 h-12 bg-white/5 rounded-full mb-1">
                          <Eye className="w-5 h-5 text-text-muted" />
                       </div>
                       <p className="text-sm font-medium text-white mb-0.5">Stream Video Restricted</p>
                       <p className="text-xs text-text-muted max-w-[85%] mx-auto text-center leading-relaxed">
                         TikTok has hidden the video feed for this specific broadcast. It might be <b>Age Restricted (18+)</b>, geo-blocked, or requires a logged-in mobile app.
                       </p>
                       <p className="text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-2 py-1 rounded">Live chat is still connected</p>
                       <div className="flex gap-2 mt-2 w-full justify-center">
                         <Button onClick={handleRefreshStream} className="h-8 text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10">Retry</Button>
                         <Button onClick={openTikTok} className="h-8 text-xs bg-[#FF0050] hover:bg-[#FF0050]/90 text-white font-semibold flex items-center gap-1.5 px-4">
                           Open App <ExternalLink className="w-3 h-3" />
                         </Button>
                       </div>
                     </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-white mb-1">
                      {status === "connecting" ? "Connecting to stream..." : "Waiting for stream URL"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {status === "connecting" ? "Establishing connection with TikTok..." : "Stream URL will appear once the connection is ready."}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Video error fallback */}
        {activeUsername && videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0e1015] z-10">
            <div className="w-16 h-16 rounded-full bg-[#1f2230] flex items-center justify-center mb-4">
              <Play className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm font-medium text-white mb-1">Stream playback failed</p>
            <p className="text-xs text-text-muted mb-4">The stream URL may have expired or been revoked.</p>
            <div className="flex gap-3">
              <Button
                className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg h-9 px-5 text-sm font-semibold"
                onClick={handleRefreshStream}
              >
                Retry Stream
              </Button>
              <Button
                className="bg-[#FF0050] hover:bg-[#FF0050]/90 text-white rounded-lg h-9 px-5 text-sm font-semibold"
                onClick={openTikTok}
              >
                Open in TikTok
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* No active username */}
        {!activeUsername && (
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-[#1f2230] flex items-center justify-center">
              <Search className="w-7 h-7 text-text-muted" />
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">No stream selected</p>
              <p className="text-xs text-text-muted max-w-[260px]">
                Search for a TikTok username in the search bar above to start monitoring their live stream.
              </p>
            </div>
          </div>
        )}

        {/* Bottom Controls Bar */}
        {activeUsername && hlsUrl && !videoError && (
          <div
            className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showOverlay ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onMouseEnter={() => setShowOverlay(true)}
          >
            <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-3 px-4">
              <div className="flex items-center gap-3">
                <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden mx-2">
                  <div className="h-full bg-[#FF0050] rounded-full animate-pulse" style={{ width: "100%" }} />
                </div>
                {status === "live" && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF0050] animate-pulse" />
                    <span className="text-[11px] font-semibold text-[#FF0050] uppercase">LIVE</span>
                  </div>
                )}
                <button
                  onClick={() => setObjectFit(prev => prev === 'cover' ? 'contain' : 'cover')}
                  className="text-white/80 hover:text-white transition-colors"
                  title="Toggle Aspect Ratio"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="border-t border-border/50 bg-[#171923] px-4 py-3">
        {activeUsername ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                src={streamerInfo?.avatar}
                alt={activeUsername}
                fallback={activeUsername?.[0]}
                size="default"
                className="border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-white text-[13px] sm:text-sm">{streamerInfo?.nickname || activeUsername}</span>
                  <svg className="w-3.5 h-3.5 text-[#00F2FE] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  {battleOpponents && battleOpponents.length > 0 && (
                     <span className="text-[10px] font-bold bg-[#FF0050] text-white px-1.5 py-0.5 rounded ml-1 tracking-wider uppercase">PK Match</span>
                  )}
                </div>
                <span className="text-[11px] sm:text-xs text-text-muted">@{activeUsername}</span>
              </div>
              <div className="hidden sm:flex items-center gap-4 sm:gap-6 text-xs text-text-muted">
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-white text-sm">Chatting</span>
                  <span>Category</span>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-white text-sm">Indonesia</span>
                  <span>Location</span>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-white text-sm">{new Date(streamStartTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                  <span>Started</span>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-white text-sm">{formatDuration(elapsed)}</span>
                  <span>Duration</span>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-white text-sm">{formatViewers(stats.viewers)}</span>
                  <span>Viewers</span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-sm font-semibold text-white leading-snug">
                {streamerInfo?.title || `Ngobrol Santai @${activeUsername}`}
              </p>
            </div>
            <div className="flex flex-row justify-between items-center">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {[`#${activeUsername}`].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] text-text-muted bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  className="bg-[#FF0050] hover:bg-[#FF0050]/90 text-white rounded-lg h-8 px-5 text-sm font-semibold cursor-pointer"
                  onClick={openTikTok}
                >
                  Open in TikTok
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
                <Button
                  variant="outline"
                  className={`rounded-lg h-9 px-5 text-sm font-medium cursor-pointer ${favorited ? "border-[#FF0050] text-[#FF0050]" : ""}`}
                  onClick={() => setFavorited(!favorited)}
                >
                  <Heart className={`w-3.5 h-3.5 mr-1.5 ${favorited ? "fill-[#FF0050]" : ""}`} />
                  Add to Favorites
                </Button>
              </div>
            </div>

            {/* <div className="flex items-center gap-3">
              <Button
                className="bg-[#FF0050] hover:bg-[#FF0050]/90 text-white rounded-lg h-8 px-5 text-sm font-semibold cursor-pointer"
                onClick={openTikTok}
              >
                Open in TikTok
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              <Button
                variant="outline"
                className={`rounded-lg h-9 px-5 text-sm font-medium cursor-pointer ${favorited ? "border-[#FF0050] text-[#FF0050]" : ""}`}
                onClick={() => setFavorited(!favorited)}
              >
                <Heart className={`w-3.5 h-3.5 mr-1.5 ${favorited ? "fill-[#FF0050]" : ""}`} />
                Add to Favorites
              </Button>
            </div> */}
          </>
        ) : (
          <div className="py-2 text-center">
            <p className="text-xs text-text-muted">Select a streamer to see details</p>
          </div>
        )}
      </div>
    </Card>
  );
}
