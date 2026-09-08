# FamOps

Private, responsive family operations web app with a React/Vite frontend and a separate Supabase backend.

The backend runs on Supabase:

- Supabase Auth
- Supabase Postgres and Storage
- Supabase Edge Functions
- Gemini AI secrets in Supabase only

No real `.env` files or backend secrets should be committed.

## Current Workspaces

- Today: live weather, per-person clothing guidance, and a Gemini family assistant
- Routines and tasks: weekly routines and per-person Kanban work
- Kitchen: AI meal generation, fridge analysis, weekly meal planning, calories, and shopping totals
- Video saves: YouTube understanding plus semantic search over stored transcripts and summaries
- Friends, finances, kids rewards, and family administration

Video files are not stored. Public YouTube links are sent directly to Gemini. Instagram and TikTok links use the optional private `services/media-extractor` worker, which downloads a bounded temporary file with `yt-dlp`, analyzes it with Gemini, and deletes both local and Gemini copies. Caption notes remain available as a fallback.

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

For local Edge Function development, create `supabase/functions/.env` from `supabase/functions/.env.example`. Enter secrets directly in the local file or Supabase Dashboard; never paste them into chat or commit them.

## Social Video Worker

The Supabase Edge Function cannot execute `yt-dlp`, so automatic Instagram and TikTok analysis runs in a separate private container while Supabase remains the authenticated API and data store. See `services/media-extractor/README.md` for local and hosted setup. Configure its full `/analyze` URL and shared key as the `MEDIA_EXTRACTOR_URL` and `MEDIA_EXTRACTOR_API_KEY` Supabase secrets.

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

