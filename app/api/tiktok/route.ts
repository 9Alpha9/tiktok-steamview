import { NextRequest, NextResponse } from "next/server";
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from "tiktok-live-connector";

// Ensure this route is evaluated dynamically, not statically built
export const dynamic = "force-dynamic";

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


export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  
  if (!username) {
    return new NextResponse("Username is required", { status: 400 });
  }

  const encoder = new TextEncoder();
  let tiktokConnection: TikTokLiveConnection | null = null;

  const customStream = new ReadableStream({
    async start(controller) {
      try {
        tiktokConnection = new TikTokLiveConnection(username, {
          processInitialData: true,
        });

        tiktokConnection.on(WebcastEvent.ROOM_USER, (data: any) => {
          const viewers = getNumber(data.viewerCount, data.userCount);
          if (viewers > 0) {
            const payload = JSON.stringify({ type: "stats", data: { viewers } });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        });

        tiktokConnection.on(WebcastEvent.LIKE, (data: any) => {
          const likes = getNumber(data.totalLikeCount, data.likeCount);
          if (likes > 0) {
            const payload = JSON.stringify({ type: "stats", data: { likes } });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        });

        tiktokConnection.on(WebcastEvent.SOCIAL, (data: any) => {
          // data.action === 1 means subscribe/follow, 3 means share
          const statsUpdate: any = {};
          if (data.action === 3) statsUpdate.sharesIncrement = 1;
          if (data.action === 1) statsUpdate.followersIncrement = 1;
          const payload = JSON.stringify({ type: "stats", data: statsUpdate });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        });

        tiktokConnection.on(WebcastEvent.STREAM_END, () => {
          const payload = JSON.stringify({ type: "stream_end" });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          try { controller.close(); } catch (e) {}
        });

        tiktokConnection.on(WebcastEvent.CHAT, (data: any) => {
          const payload = JSON.stringify({ type: "chat", data });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        });

        tiktokConnection.on(WebcastEvent.GIFT, (data: any) => {
          if (data.giftType === 1 && !data.repeatEnd) {
            // Wait for repeatEnd for combo gifts, or handle individually
            return;
          }
          const payload = JSON.stringify({ type: "gift", data });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          const count = getNumber(data.repeatCount, data.comboCount, 1);
          const statsPayload = JSON.stringify({ type: "stats", data: { giftsIncrement: count } });
          controller.enqueue(encoder.encode(`data: ${statsPayload}\n\n`));
        });

        tiktokConnection.on(ControlEvent.ERROR, (err: any) => {
          const errorMessage = getErrorMessage(err);
          console.log(`[TikTok] Stream error for ${username}: ${errorMessage}`);
          const payload = JSON.stringify({ type: "error", message: errorMessage });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        });

        tiktokConnection.on(ControlEvent.DISCONNECTED, () => {
          const payload = JSON.stringify({ type: "disconnected" });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          try { controller.close(); } catch (e) {}
        });

        const connectionState = await tiktokConnection.connect();
        const roomInfo = (connectionState as any)?.roomInfo || {};
        const roomData = roomInfo.data || roomInfo;
        const liveRoom = roomData.liveRoom || roomData.live_room || {};
        const room = roomData.room || liveRoom.room || liveRoom || roomData;
        const stats = roomData.stats || liveRoom.stats || room.stats || {};
        const owner = roomData.owner || liveRoom.owner || room.owner || {};
        const avatarUrl = owner.avatar_thumb?.url_list?.[0]
          || owner.avatarThumb?.urlList?.[0]
          || owner.avatar_medium?.url_list?.[0]
          || owner.avatarMedium?.urlList?.[0];
        
        const title = roomData.title || liveRoom.title || room.title || "";
        const nickname = owner.nickname || owner.display_id || username;

        const streamUrlObj = roomData.stream_url || liveRoom.stream_url || room.stream_url || {};
        const hlsPullUrl = streamUrlObj.hls_pull_url
          || streamUrlObj.HlsUrl
          || streamUrlObj.hls_pull_url_map?.["FULL_HD1"]
          || streamUrlObj.hls_pull_url_map?.["HD1"]
          || streamUrlObj.hls_pull_url_map?.["SD1"]
          || "";
        const flvPullUrl = streamUrlObj.flv_pull_url?.FULL_HD1
          || streamUrlObj.flv_pull_url?.HD1
          || streamUrlObj.flv_pull_url?.SD1
          || streamUrlObj.FlvUrl
          || "";

        const coverUrl = roomData.cover
          || liveRoom.cover
          || room.cover
          || "";

        const payload = JSON.stringify({ 
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
        });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));

      } catch (err: any) {
        const errorMessage = getErrorMessage(err);
        console.log(`[TikTok] Connection failed for ${username}: ${errorMessage}`);
        const payload = JSON.stringify({ type: "error", message: errorMessage });
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          controller.close();
        } catch (e) {}
      }

      req.signal.addEventListener("abort", () => {
        if (tiktokConnection) {
          tiktokConnection.disconnect();
        }
        try { controller.close(); } catch (e) {}
      });
    },
    cancel() {
      if (tiktokConnection) {
        tiktokConnection.disconnect();
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
