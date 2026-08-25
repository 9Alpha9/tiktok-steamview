# TikTok Proxy - Cloudflare Worker

## Deploy (Manual - Dashboard)

1. Buka https://dash.cloudflare.com → Login
2. Klik **Workers & Pages** → **Create Worker**
3. Beri nama (misal: `tiktok-proxy`), klik **Deploy**
4. Klik **Edit Code** → hapus kode default, paste isi `worker.js` ini
5. Klik **Deploy**

URL worker akan jadi: `https://tiktok-proxy.<username>.workers.dev`

## Deploy (CLI)

```bash
npm install -g wrangler
wrangler login
wrangler init tiktok-proxy
# Copy isi worker.js ke src/index.js
wrangler deploy
```

## Set Environment Variable di Vercel

1. Buka https://vercel.com → Project → Settings → Environment Variables
2. Tambah:
   - Name: `CLOUDFLARE_PROXY_URL`
   - Value: `https://tiktok-proxy.<username>.workers.dev`
3. klik **Save**
4. Redeploy project
