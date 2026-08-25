import { NextRequest, NextResponse } from "next/server";
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from "tiktok-live-connector";

export const dynamic = "force-dynamic";

const CONNECT_TIMEOUT_MS = 30_000;
const CONNECTION_COOLDOWN_MS = 15_000;
const MAX_CONCURRENT_CONNECTIONS = 3;
const recentConnections = new Map<string, number>();
let activeConnections = 0;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message) return message;
  }
  return "TikTok LIVE is unavailable for this account.";
}

function getNumber(...values: unknown[]): number {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return 0;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

function deepExtractStreamUrl(obj: any): { hls: string; flv: string } {
  if (!obj || typeof obj !== "object") return { hls: "", flv: "" };

  let hls = obj.hls_pull_url
    || obj.HlsUrl
    || obj.hls_pull_url_map?.["FULL_HD1"]
    || obj.hls_pull_url_map?.["HD1"]
    || obj.hls_pull_url_map?.["SD1"]
    || obj.hls
    || "";
  let flv = obj.flv_pull_url?.FULL_HD1
    || obj.flv_pull_url?.HD1
    || obj.flv_pull_url?.SD1
    || obj.FlvUrl
    || obj.flv
    || "";

  // Helper to brutally find first m3u8 url in a stringified JSON if standard paths fail
  const forceExtractM3u8 = (targetObj: any) => {
     try {
       const str = typeof targetObj === 'string' ? targetObj : JSON.stringify(targetObj);
       // Less restrictive regex to capture the full URL even if it has complex params
       const match = str.match(/(https?:\/\/[^\s"',]+\.m3u8[^\s"',]*)/);
       if (match) return match[1].replace(/\\u0026/g, '&');
     } catch(e) {}
     return "";
  };

  const forceExtractFlv = (targetObj: any) => {
     try {
       const str = typeof targetObj === 'string' ? targetObj : JSON.stringify(targetObj);
       const match = str.match(/(https?:\/\/[^\s"',]+\.flv[^\s"',]*)/);
       if (match) return match[1].replace(/\\u0026/g, '&');
     } catch(e) {}
     return "";
  };

  if (!hls) {
    const streamDataRaw = obj.live_core_sdk_data?.pull_data?.stream_data
      || obj.stream_data
      || obj.streamData
      || "";
    if (typeof streamDataRaw === "string" && streamDataRaw) {
      try {
        const streamData = JSON.parse(streamDataRaw);
        hls = streamData.data?.origin?.main?.hls
          || streamData.data?.FULL_HD1?.main?.hls
          || streamData.data?.HD1?.main?.hls
          || streamData.data?.SD1?.main?.hls
          || streamData.data?.hd?.main?.hls
          || streamData.data?.ld?.main?.hls
          || streamData.data?.ao?.main?.hls
          || streamData.data?.["1080p"]?.main?.hls
          || streamData.data?.["720p"]?.main?.hls
          || streamData.data?.["480p"]?.main?.hls
          || streamData.data?.default?.main?.hls
          || "";
        flv = streamData.data?.origin?.main?.flv
          || streamData.data?.FULL_HD1?.main?.flv
          || streamData.data?.HD1?.main?.flv
          || streamData.data?.SD1?.main?.flv
          || streamData.data?.hd?.main?.flv
          || streamData.data?.ld?.main?.flv
          || streamData.data?.ao?.main?.flv
          || streamData.data?.["1080p"]?.main?.flv
          || streamData.data?.["720p"]?.main?.flv
          || streamData.data?.["480p"]?.main?.flv
          || streamData.data?.default?.main?.flv
          || "";
      } catch {}
    } else if (typeof streamDataRaw === "object" && streamDataRaw) {
      hls = streamDataRaw.default?.origin?.main?.hls
        || streamDataRaw.default?.FULL_HD1?.main?.hls
        || streamDataRaw.default?.HD1?.main?.hls
        || streamDataRaw.default?.SD1?.main?.hls
        || streamDataRaw.default?.["1080p"]?.main?.hls
        || streamDataRaw.origin?.main?.hls
        || streamDataRaw.FULL_HD1?.main?.hls
        || "";
      flv = streamDataRaw.default?.origin?.main?.flv
        || streamDataRaw.default?.FULL_HD1?.main?.flv
        || streamDataRaw.default?.HD1?.main?.flv
        || streamDataRaw.default?.SD1?.main?.flv
        || streamDataRaw.default?.["1080p"]?.main?.flv
        || streamDataRaw.origin?.main?.flv
        || streamDataRaw.FULL_HD1?.main?.flv
        || "";
    }
    
    // Bruteforce fallback if structured search failed
    if (!hls && streamDataRaw) hls = forceExtractM3u8(streamDataRaw);
    if (!flv && streamDataRaw) flv = forceExtractFlv(streamDataRaw);
  }

  if (!hls && obj.hls_pull_url_map && typeof obj.hls_pull_url_map === "object") {
    // If specific keys aren't found, just grab the first available HLS URL string from the map
    const keys = Object.keys(obj.hls_pull_url_map);
    for (const k of keys) {
       const val = obj.hls_pull_url_map[k];
       if (typeof val === "string" && val.includes(".m3u8")) {
          hls = val;
          break;
       }
    }
  }

  // Very aggressive fallback if nested in unknown resolution objects
  if (!hls && typeof obj === "object" && obj !== null) {
     hls = forceExtractM3u8(obj);
  }
  if (!flv && typeof obj === "object" && obj !== null) {
     flv = forceExtractFlv(obj);
  }

  return { hls, flv };
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");

  if (!username) {
    return new NextResponse("Username is required", { status: 400 });
  }

  const now = Date.now();
  const lastConnection = recentConnections.get(username) ?? 0;

  if (activeConnections >= MAX_CONCURRENT_CONNECTIONS) {
    return new NextResponse("Too many active TikTok connections. Please wait a moment.", { status: 429 });
  }

  if (now - lastConnection < CONNECTION_COOLDOWN_MS) {
    return new NextResponse("Please wait before reconnecting to this user.", { status: 429 });
  }

  recentConnections.set(username, now);
  activeConnections += 1;

  const encoder = new TextEncoder();
  let tiktokConnection: TikTokLiveConnection | null = null;
  let closed = false;

  const customStream = new ReadableStream({
    start(controller) {
      const safeEnqueue = (payload: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`data: ${payload}\n\n`)); } catch (e) {}
      };
      const safeClose = () => {
        if (closed) return;
        closed = true;
        activeConnections = Math.max(0, activeConnections - 1);
        try { controller.close(); } catch (e) {}
      };

      const cleanup = () => {
        if (tiktokConnection) {
          try { tiktokConnection.disconnect(); } catch (e) {}
        }
        safeClose();
      };

      req.signal.addEventListener("abort", cleanup);

      safeEnqueue(JSON.stringify({ type: "connecting", username }));

      (async () => {
        try {
          tiktokConnection = new TikTokLiveConnection(username, {
            processInitialData: true,
          });

        tiktokConnection.on(WebcastEvent.ROOM_USER, (data: any) => {
          const viewers = getNumber(data.viewerCount, data.userCount, data.total);
          if (viewers > 0) {
            safeEnqueue(JSON.stringify({ type: "stats", data: { viewers } }));
          }
        });

        tiktokConnection.on(WebcastEvent.MEMBER, (data: any) => {
          const viewers = getNumber(data.memberCount);
          if (viewers > 0) {
            safeEnqueue(JSON.stringify({ type: "stats", data: { viewers } }));
          }
        });

        tiktokConnection.on(WebcastEvent.LIKE, (data: any) => {
          const likes = getNumber(data.totalLikeCount, data.likeCount);
          const likesIncrement = data.likeCount || 1;
          const likeSender = data.user;
          
          if (likes > 0) {
            safeEnqueue(JSON.stringify({ type: "stats", data: { likes, likesIncrement, likeSender } }));
          } else {
             safeEnqueue(JSON.stringify({ type: "stats", data: { likesIncrement, likeSender } }));
          }
        });

        tiktokConnection.on(WebcastEvent.SOCIAL, (data: any) => {
          const statsUpdate: any = {};
          // Action 3 is share, action 1 is follow
          if (data.action === 3 || data.label?.includes('share')) {
             statsUpdate.sharesIncrement = 1;
          }
          if (data.action === 1 || data.label?.includes('follow') || data.action === 10) {
             statsUpdate.followersIncrement = 1;
          }
          safeEnqueue(JSON.stringify({ type: "stats", data: statsUpdate }));
        });

        tiktokConnection.on(WebcastEvent.STREAM_END, () => {
          safeEnqueue(JSON.stringify({ type: "stream_end" }));
          safeClose();
        });

        tiktokConnection.on(WebcastEvent.CHAT, (data: any) => {
          safeEnqueue(JSON.stringify({ type: "chat", data }));
        });

        tiktokConnection.on(WebcastEvent.GIFT, (data: any) => {
          if (data.giftType === 1 && !data.repeatEnd) return;
          safeEnqueue(JSON.stringify({ type: "gift", data }));
          const count = getNumber(data.repeatCount, data.comboCount, 1);
          safeEnqueue(JSON.stringify({ type: "stats", data: { giftsIncrement: count } }));
        });

        // Listen for link mic / PK battles to get opponents
        tiktokConnection.on('linkMicBattle' as any, (data: any) => {
           if (data?.battleUsers) {
               safeEnqueue(JSON.stringify({ type: "battle", data: data.battleUsers }));
           }
        });
        
        tiktokConnection.on('linkMicArmies' as any, (data: any) => {
           if (data?.battleArmies) {
               safeEnqueue(JSON.stringify({ type: "battle_update", data: data.battleArmies }));
           }
        });

        tiktokConnection.on(ControlEvent.ERROR, (err: any) => {
          const errorMessage = getErrorMessage(err);
          console.log(`[TikTok] Stream error for ${username}: ${errorMessage}`);
          safeEnqueue(JSON.stringify({ type: "error", message: errorMessage }));
        });

        tiktokConnection.on(ControlEvent.DISCONNECTED, () => {
          safeEnqueue(JSON.stringify({ type: "disconnected" }));
          safeClose();
        });

        console.log(`[TikTok] Connecting to ${username}...`);
        const connectionState = await withTimeout(
          tiktokConnection.connect(),
          CONNECT_TIMEOUT_MS,
          `connect(${username})`,
        );
        console.log(`[TikTok] Connected to ${username}, extracting room info...`);

        // Send 'connected' quickly before heavy scraping if we already have the URL from the websocket handshake
        const fastRoomInfo = (connectionState as any)?.roomInfo || (tiktokConnection as any)?.roomInfo || {};
        const fastRoomData = fastRoomInfo.data || fastRoomInfo;
        const fastLiveRoom = fastRoomData.liveRoom || fastRoomData.live_room || {};
        const fastRoom = fastRoomData.room || fastLiveRoom.room || fastLiveRoom || fastRoomData;
        
        // Deep search for stream url across all fast potential objects
        let fastStreamExtracted = deepExtractStreamUrl(fastRoomData.stream_url || fastLiveRoom.stream_url || fastRoom.stream_url || {});
        if (!fastStreamExtracted.hls) {
           for (const candidate of [fastRoomData, fastLiveRoom, fastRoom]) {
              if (candidate?.stream_url) {
                const r = deepExtractStreamUrl(candidate.stream_url);
                if (r.hls) { fastStreamExtracted = r; break; }
              }
           }
        }
        
        // End the execution here since we already have what we need, making it super fast
        
        let shouldProceed = false;
        
        let finalHls = fastStreamExtracted.hls || "";
        
        // We will send connected IMMEDIATELY so chat can load, even if we don't have HLS yet!
        safeEnqueue(JSON.stringify({
          type: "connected",
          username,
          roomInfo: {
            viewers: getNumber(fastRoomData.user_count, fastRoomData.userCount, fastRoomData.viewer_count, fastRoomData.viewerCount),
            likes: getNumber(fastRoomData.like_count, fastRoomData.likeCount, fastRoomData.total_like_count),
            shares: getNumber(fastRoomData.share_count, fastRoomData.shareCount),
            followers: getNumber(fastRoomData.owner?.follow_info?.follower_count, fastRoomData.owner?.followInfo?.followerCount, fastRoomData.owner?.follower_count, fastRoomData.owner?.followerCount),
            avatarUrl: fastRoomData.owner?.avatar_thumb?.url_list?.[0] || fastRoomData.owner?.avatarThumb?.urlList?.[0] || fastRoomData.owner?.avatar_medium?.url_list?.[0],
            title: fastRoomData.title || fastLiveRoom.title || fastRoom.title || "",
            nickname: fastRoomData.owner?.nickname || fastRoomData.owner?.display_id || username,
            hlsPullUrl: finalHls,
            flvPullUrl: fastStreamExtracted.flv,
            coverUrl: fastRoomData.cover?.url_list?.[0] || fastRoomData.cover?.urlList?.[0] || fastLiveRoom.cover?.url_list?.[0],
          }
        }));

        if (fastStreamExtracted.hls) {
            shouldProceed = true;
        }

        if (shouldProceed) return;
        
        const roomInfo = fastRoomInfo;
        const roomData = fastRoomData;
        const liveRoom = roomData.liveRoom || roomData.live_room || {};
        const room = roomData.room || liveRoom.room || liveRoom || roomData;
        const stats = roomData.stats || liveRoom.stats || room.stats || {};
        const owner = roomData.owner || liveRoom.owner || room.owner || {};

        const avatarUrl = owner.avatar_thumb?.url_list?.[0]
          || owner.avatarThumb?.urlList?.[0]
          || owner.avatar_medium?.url_list?.[0]
          || owner.avatarMedium?.urlList?.[0]
          || (typeof owner.avatar_url === "string" ? owner.avatar_url : undefined);

        let title = roomData.title || liveRoom.title || room.title || "";
        const nickname = owner.nickname || owner.display_id || username;

        if (!title) {
          try {
            const webClient = (tiktokConnection as any).webClient;
            const apiData = await webClient.getJsonObjectFromTikTokApi("api-live/user/room/", {
              ...webClient.clientParams,
              uniqueId: username,
              sourceType: "54",
            });
            const apiRoom = apiData?.data?.liveRoom || apiData?.data?.live_room || {};
            title = apiRoom.title || "";
          } catch (e: any) {}
        }

        if (!title) {
          try {
            const webClient = (tiktokConnection as any).webClient;
            const html: string = await webClient.getHtmlFromTikTokWebsite(`@${username}/live`);
            const ogTitle = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]*)"/i);
            if (ogTitle?.[1]) {
              title = ogTitle[1].replace(/\s*on TikTok\s*$/, "").trim();
            }
            if (!title) {
              const pageTitle = html.match(/<title>([^<]*)<\/title>/i);
              if (pageTitle?.[1]) {
                title = pageTitle[1].replace(/\s*on TikTok\s*$/, "").replace(/\s*\|\s*TikTok\s*$/, "").trim();
              }
            }
          } catch (e: any) {}
        }

        let streamUrlObj = roomData.stream_url || liveRoom.stream_url || room.stream_url || {};
        let { hls: hlsPullUrl, flv: flvPullUrl } = deepExtractStreamUrl(streamUrlObj);

        if (!hlsPullUrl) {
          const altStreamUrl = room.stream_url || liveRoom.stream_url || roomData.stream_url || {};
          const alt = deepExtractStreamUrl(altStreamUrl);
          if (alt.hls) {
            hlsPullUrl = alt.hls;
            flvPullUrl = alt.flv;
          }
        }

        if (!hlsPullUrl) {
          for (const candidate of [roomData, liveRoom, room]) {
            if (candidate?.stream_url) {
              const r = deepExtractStreamUrl(candidate.stream_url);
              if (r.hls) { hlsPullUrl = r.hls; flvPullUrl = r.flv; break; }
            }
          }
        }

        const coverUrlObj = roomData.cover || liveRoom.cover || room.cover || {};
        let coverUrl = coverUrlObj.url_list?.[0] || coverUrlObj.urlList?.[0] || (typeof coverUrlObj === "string" ? coverUrlObj : "");

        if (!hlsPullUrl) {
          try {
            const webClient = (tiktokConnection as any).webClient;
            
            // Try fetching from the web API first
            let apiData = await webClient.getJsonObjectFromTikTokApi("api-live/user/room/", {
              ...webClient.clientParams,
              uniqueId: username,
              sourceType: "54",
            });
            
            let apiLiveRoom = apiData?.data?.liveRoom || apiData?.data?.room || {};
            let apiStreamUrl = apiLiveRoom.streamData || apiLiveRoom.stream_url || apiLiveRoom.streamDataJson || {};
            let apiExtracted = deepExtractStreamUrl(apiStreamUrl);
            
            // If that fails, TikTok sometimes completely hides it from web clients for PKs
            // We can try to extract directly from the raw HTML of the user's live page
            if (!apiExtracted.hls) {
               try {
                 const html: string = await webClient.getHtmlFromTikTokWebsite(`@${username}/live`);
                 // Bruteforce the ENTIRE HTML page for any m3u8 url
                 // TikTok sometimes injects it in weird script tags or attributes
                 const m3Match = html.match(/(https?:\/\/[^\s"',<>]+\.m3u8[^\s"',<>]*)/);
                 if (m3Match) {
                    apiExtracted.hls = m3Match[1].replace(/\\u0026/g, '&');
                 }
                 
                 const flvMatch = html.match(/(https?:\/\/[^\s"',<>]+\.flv[^\s"',<>]*)/);
                 if (flvMatch && !apiExtracted.flv) {
                    apiExtracted.flv = flvMatch[1].replace(/\\u0026/g, '&');
                 }
                 
                 // Get fallback title if missing
                 if (!title) {
                   const titleMatch = html.match(/"title":"([^"]+)"/);
                   if (titleMatch) title = titleMatch[1];
                 }
                 
                 // Get fallback cover if missing
                 if (!coverUrl) {
                    const coverMatch = html.match(/"coverUrl":"([^"]+)"/);
                    if (coverMatch) coverUrl = coverMatch[1].replace(/\\u0026/g, '&');
                 }
               } catch (htmlErr) {}
            }
            
            if (apiExtracted.hls) {
              hlsPullUrl = apiExtracted.hls;
              if (apiExtracted.flv) flvPullUrl = apiExtracted.flv;
            }

            if (!title) title = apiLiveRoom.title || "";
            if (!coverUrl) {
              const apiCover = apiLiveRoom.coverUrl || "";
              if (apiCover) coverUrl = apiCover;
            }
          } catch {}
        }
        
        // Final fallback: if connection succeeded but we missed the "connected" event due to fast chat messages
        // or missing stream URL, let's trigger it now. We ensure this always gets sent when connect() succeeds.

        safeEnqueue(JSON.stringify({
          type: "stream_url",
          username,
          roomInfo: {
            viewers: getNumber(
              roomData.user_count, roomData.userCount, roomData.viewer_count, roomData.viewerCount,
              liveRoom.user_count, liveRoom.userCount, liveRoom.viewer_count, liveRoom.viewerCount,
              room.user_count, room.userCount, room.viewer_count, room.viewerCount,
              stats.user_count, stats.userCount, stats.viewer_count, stats.viewerCount,
            ),
            likes: getNumber(
              roomData.like_count, roomData.likeCount, roomData.total_like_count, roomData.totalLikeCount,
              liveRoom.like_count, liveRoom.likeCount, liveRoom.total_like_count, liveRoom.totalLikeCount,
              room.like_count, room.likeCount, room.total_like_count, room.totalLikeCount,
              stats.like_count, stats.likeCount, stats.total_like_count, stats.totalLikeCount,
            ),
            shares: getNumber(
              roomData.share_count, roomData.shareCount,
              liveRoom.share_count, liveRoom.shareCount,
              room.share_count, room.shareCount,
              stats.share_count, stats.shareCount,
            ),
            followers: getNumber(
              owner.follow_info?.follower_count, owner.followInfo?.followerCount,
              owner.follower_count, owner.followerCount,
            ),
            avatarUrl,
            title,
            nickname,
            hlsPullUrl,
            flvPullUrl,
            coverUrl,
          }
        }));

        } catch (err: any) {
          const errorMessage = getErrorMessage(err);
          console.log(`[TikTok] Connection failed for ${username}: ${errorMessage}`);
          
          if (errorMessage.includes("The requested user isn't online") || errorMessage.includes("not found")) {
              safeEnqueue(JSON.stringify({ type: "stream_end", message: "User is not currently live" }));
          } else {
              safeEnqueue(JSON.stringify({ type: "error", message: errorMessage }));
          }
          
          safeClose();
        }
      })();
    },
    cancel() {
      if (tiktokConnection) {
        try { tiktokConnection.disconnect(); } catch (e) {}
      }
      if (!closed) {
        closed = true;
        activeConnections = Math.max(0, activeConnections - 1);
      }
    }
  });

  return new Response(customStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
