import { NextRequest, NextResponse } from "next/server";
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from "tiktok-live-connector";

export const dynamic = "force-dynamic";

const CONNECT_TIMEOUT_MS = 30_000;

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
    || "";
  let flv = obj.flv_pull_url?.FULL_HD1
    || obj.flv_pull_url?.HD1
    || obj.flv_pull_url?.SD1
    || obj.FlvUrl
    || "";

  if (!hls && obj.live_core_sdk_data?.pull_data?.stream_data) {
    try {
      const streamData = JSON.parse(obj.live_core_sdk_data.pull_data.stream_data);
      hls = streamData.data?.origin?.main?.hls
        || streamData.data?.FULL_HD1?.main?.hls
        || streamData.data?.HD1?.main?.hls
        || streamData.data?.SD1?.main?.hls
        || streamData.data?.hd?.main?.hls
        || streamData.data?.ld?.main?.hls
        || "";
      flv = streamData.data?.origin?.main?.flv
        || streamData.data?.FULL_HD1?.main?.flv
        || streamData.data?.HD1?.main?.flv
        || streamData.data?.SD1?.main?.flv
        || streamData.data?.hd?.main?.flv
        || streamData.data?.ld?.main?.flv
        || "";
    } catch (e) {
      console.error("[TikTok] Failed to parse stream_data JSON:", e);
    }
  }

  return { hls, flv };
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");

  if (!username) {
    return new NextResponse("Username is required", { status: 400 });
  }

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
          if (likes > 0) {
            safeEnqueue(JSON.stringify({ type: "stats", data: { likes } }));
          }
        });

        tiktokConnection.on(WebcastEvent.SOCIAL, (data: any) => {
          const statsUpdate: any = {};
          if (data.action === 3) statsUpdate.sharesIncrement = 1;
          if (data.action === 1) statsUpdate.followersIncrement = 1;
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

        const roomInfo = (connectionState as any)?.roomInfo || {};
        const roomData = roomInfo.data || roomInfo;
        const liveRoom = roomData.liveRoom || roomData.live_room || {};
        const room = roomData.room || liveRoom.room || liveRoom || roomData;
        const stats = roomData.stats || liveRoom.stats || room.stats || {};
        const owner = roomData.owner || liveRoom.owner || room.owner || {};

        const avatarUrl = owner.avatar_thumb?.url_list?.[0]
          || owner.avatarThumb?.urlList?.[0]
          || owner.avatar_medium?.url_list?.[0]
          || owner.avatarMedium?.urlList?.[0]
          || (typeof owner.avatar_url === "string" ? owner.avatar_url : undefined);

        const title = roomData.title || liveRoom.title || room.title || "";
        const nickname = owner.nickname || owner.display_id || username;

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

        console.log(`[TikTok] ${username} hlsPullUrl: ${hlsPullUrl ? "found" : "EMPTY"}`);

        const coverUrlObj = roomData.cover || liveRoom.cover || room.cover || {};
        const coverUrl = coverUrlObj.url_list?.[0] || coverUrlObj.urlList?.[0] || (typeof coverUrlObj === "string" ? coverUrlObj : "");

        safeEnqueue(JSON.stringify({
          type: "connected",
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
          safeEnqueue(JSON.stringify({ type: "error", message: errorMessage }));
          safeClose();
        }
      })();
    },
    cancel() {
      if (tiktokConnection) {
        try { tiktokConnection.disconnect(); } catch (e) {}
      }
      closed = true;
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
