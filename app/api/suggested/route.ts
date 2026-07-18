import { NextRequest } from "next/server";
import { TikTokLiveConnection } from "tiktok-live-connector";

export const dynamic = "force-dynamic";

interface SuggestedLive {
  username: string;
  nickname: string;
  avatar: string;
  viewers: number;
  title: string;
  coverUrl: string;
}

export async function GET(req: NextRequest) {
  try {
    const conn = new TikTokLiveConnection("__temp__", { processInitialData: false });
    const webClient = (conn as any).webClient;

    const html: string = await webClient.getHtmlFromTikTokWebsite("discover?lang=en");

    const sigiMatch = html.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/);
    if (!sigiMatch) {
      return Response.json({ lives: [] });
    }

    const sigiState = JSON.parse(sigiMatch[1]);
    const liveItems: SuggestedLive[] = [];

    const keys = Object.keys(sigiState);
    for (const key of keys) {
      const val = sigiState[key];
      if (!val || typeof val !== "object") continue;

      const lists = [val, val.data, val.defaultData, val.itemList].filter(Boolean);
      for (const list of lists) {
        if (!Array.isArray(list)) continue;
        for (const item of list) {
          if (!item || typeof item !== "object") continue;
          const user = item.user || item.author || item.owner;
          const liveRoom = item.liveRoom || item.live_room || item.room;
          if (!user) continue;

          const username = user.uniqueId || user.displayId || user.unique_id || user.display_id;
          if (!username) continue;

          const roomInfo = liveRoom || item;
          const status = roomInfo.status || item.status;
          const isLive = status === 2 || status === "2" || item.isLive || item.is_live;
          if (!isLive) continue;

          const viewerCount = getNumber(
            roomInfo.viewerCount, roomInfo.userCount, roomInfo.user_count, roomInfo.viewer_count,
            item.viewerCount, item.userCount, item.user_count, item.viewer_count,
            item.stats?.viewerCount, item.stats?.userCount,
          );

          const avatar = user.avatarThumb?.urlList?.[0]
            || user.avatar_thumb?.url_list?.[0]
            || user.avatarMedium?.urlList?.[0]
            || user.avatar_medium?.url_list?.[0]
            || "";

          const cover = roomInfo.cover?.urlList?.[0]
            || roomInfo.cover?.url_list?.[0]
            || roomInfo.coverUrl
            || item.coverUrl
            || "";

          liveItems.push({
            username,
            nickname: user.nickname || username,
            avatar,
            viewers: viewerCount,
            title: roomInfo.title || item.title || "",
            coverUrl: cover,
          });
        }
      }
    }

    const seen = new Set<string>();
    const unique = liveItems.filter((item) => {
      if (seen.has(item.username)) return false;
      seen.add(item.username);
      return true;
    });

    unique.sort((a, b) => b.viewers - a.viewers);

    return Response.json({ lives: unique.slice(0, 20) });
  } catch (err: any) {
    console.error("[Suggested] Failed to fetch:", err.message);
    return Response.json({ lives: [] });
  }
}

function getNumber(...values: unknown[]): number {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return 0;
}
