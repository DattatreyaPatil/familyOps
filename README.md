# FamOps Frontend

Frontend-only React/Vite web app for FamOps.

The backend runs on Supabase:

- Supabase Auth
- Supabase Postgres and Storage
- Supabase Edge Functions
- Gemini AI secrets in Supabase only

No real `.env` files or backend secrets should be committed.

## Local Development

Create `apps/frontend/.env`:

```env
VITE_API_MODE=supabase-edge
VITE_AI_API_MODE=supabase-edge
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_API_URL=https://unused-when-api-mode-is-supabase-edge
```

Then run:

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Cloudflare Pages:

```text
Build command: npm install && npm run build
Build output directory: apps/frontend/dist
Root directory: /
```

Cloudflare Workers static assets:

```text
Root directory: /
Build command: npm run build
Deploy command: npx wrangler deploy
Non-production deploy command: npx wrangler versions upload
```

