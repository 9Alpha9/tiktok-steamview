# TikTok LIVE Monitor

This dashboard uses TikTok's official **Embed LIVE Player**. It does not extract, proxy, or re-host TikTok video streams, and it does not scrape live-chat messages.

## Required setup

1. Deploy the site to an HTTPS domain.
2. Request that domain be approved for TikTok Embed LIVE access through TikTok Developer Support.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_TIKTOK_EMBED_DOMAIN` to that exact approved domain.

TikTok validates the host domain itself. The dashboard always attempts to load the player, including during local development; TikTok will show its blocked state if the domain is not approved. TikTok's current LIVE Embed policy does not allow `localhost` or IP addresses on its production allowlist.

## Chat

TikTok's official Embed LIVE documentation provides playback controls and events, but no host-side live-chat message API. Chat is therefore not copied into this dashboard or reloaded in a separate list; any chat TikTok chooses to show remains inside its official player.

## Run locally

```bash
npm run dev
```

Local development also loads the official player so its behavior can be checked directly. Playback depends on TikTok accepting the `embed_domain`; use an approved HTTPS domain for production.
