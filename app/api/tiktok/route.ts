import { NextRequest, NextResponse } from "next/server";
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from "tiktok-live-connector";

// Ensure this route is evaluated dynamically, not statically built
export const dynamic = "force-dynamic";



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
          processInitialData: false,
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
        });

        tiktokConnection.on(ControlEvent.ERROR, (err: any) => {
          console.error("TikTok connection error:", err);
          const payload = JSON.stringify({ type: "error", message: err.message });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        });

        tiktokConnection.on(ControlEvent.DISCONNECTED, () => {
          const payload = JSON.stringify({ type: "disconnected" });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          try { controller.close(); } catch (e) {}
        });

        await tiktokConnection.connect();
        
        const payload = JSON.stringify({ type: "connected", username });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));

      } catch (err: any) {
        console.error("Failed to connect to TikTok LIVE:", err);
        const payload = JSON.stringify({ type: "error", message: err.message || "Failed to connect" });
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
