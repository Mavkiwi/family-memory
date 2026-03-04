# Family Memory — Project CLAUDE.md

## Overview
Family Memory captures life stories via question-prompted audio recordings, text, and photos.
Family members receive secure token links, open the page, record/write/upload, and stories are
stored on Cloudflare (R2 for media, D1 for metadata) with OpenAI Whisper transcription.

**Context**: Home
**Stack**: Cloudflare Pages + Functions (Pattern 2: React + TypeScript)
**Port**: 5173 (Vite dev), 8788 (Wrangler dev API)

## Architecture

```
Frontend (Cloudflare Pages)          Backend (Pages Functions)
React 19 + Vite 7 + Tailwind 4      TypeScript handlers in functions/api/
+ TanStack Query v5                  + D1 database (SQLite at edge)
+ React Router v7                    + R2 bucket (media files)
                                     + OpenAI Whisper API (transcription)
```

## Project Structure

```
family-memory/
├── db/
│   ├── schema.sql           — 6 tables + indexes (D1)
│   └── seed.sql             — 10 seed questions, default admin
├── functions/api/           — Cloudflare Pages Functions (API)
│   ├── _shared.ts           — Env types, CORS, security headers, response helpers
│   ├── _token.ts            — HMAC token gen/validate (Web Crypto API)
│   ├── _schemas.ts          — Zod validation schemas
│   ├── health.ts            — GET /api/health
│   ├── auth/verify-pin.ts   — POST admin PIN login (rate-limited)
│   ├── respond/             — Token-based public endpoints
│   │   ├── [token].ts       — GET question / POST text response
│   │   └── [token]/         — upload-url, upload, complete, skip
│   └── admin/               — Admin CRUD (recipients, questions, assignments, responses)
├── src/                     — React frontend
│   ├── components/          — AudioVisualizer, DurationTimer, QuestionCard, ResponseTabs
│   ├── hooks/               — useAudioRecorder
│   ├── lib/                 — API client, audioCompressor, utils
│   └── pages/               — Landing, Respond, Thanks, Admin (Login, Dashboard, CRUD)
├── wrangler.toml            — D1 + R2 bindings
├── .dev.vars                — Local secrets (not committed)
└── CLAUDE.md                — This file
```

## Development

```bash
npm run dev              # Vite dev server (frontend) on :5173
npm run dev:api          # Wrangler Pages dev (API) on :8788
npm run build            # TypeScript check + Vite production build
npm run db:setup:local   # Create local D1 tables + seed data
npm run deploy           # Build + deploy to Cloudflare Pages
```

## Database (Cloudflare D1)

6 tables: `recipients`, `questions`, `assignments`, `responses`, `admin_users`, `audit_log`
Plus `pin_attempts` for rate limiting.

All queries use parameterised placeholders: `db.prepare('... WHERE id = ?').bind(id)`

## Token Format

`base64url(recipientId.assignmentId.expiryTimestamp.hmac)`
- HMAC: first 16 hex chars of SHA-256(payload, TOKEN_SECRET) via Web Crypto API
- Default expiry: 14 days

## R2 Storage Layout

```
family-memory/
  audio/{recipient_id}/{assignment_id}/{uuid}.{ext}
  photos/{recipient_id}/{assignment_id}/{uuid}.{ext}
  transcripts/{assignment_id}/{recording_id}-raw.txt
```

## API Response Envelope

All endpoints return:
```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 25, "total": 100 },
  "error": null,
  "code": null
}
```

## Conventions

- **Functional components only** — named exports
- **Tailwind CSS** — no custom CSS unless unavoidable
- **Zod validation** on all API request schemas
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **CORS**: restricted to known origins
- **Rate limiting**: PIN auth (5 attempts / 15 min per IP)
- **Audit logging**: all mutations logged to `audit_log` table
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **Commit prefix**: `[claude]` for Claude Code, `[cursor]` for Cursor

## Secrets (wrangler secret put)

- `TOKEN_SECRET` — HMAC signing key
- `OPENAI_API_KEY` — Whisper transcription
- `ADMIN_PIN` — Admin access (4-digit)

## Phases

1. **Infrastructure + Response Collection** (MVP) — DONE
2. **Admin Dashboard** — DONE (basic CRUD)
3. **Transcription Pipeline** — Stub ready (waitUntil hook in complete.ts)
4. **Notifications + Polish** — TODO (n8n webhook, PWA, photos)
