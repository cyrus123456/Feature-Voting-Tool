> [全局规则引用] c:\Users\73476\.config\opencode\AGENTS.md

# Feature Voting Tool — Agent Guide

Feature voting platform with multilingual UI (en/vi/zh); **feature content is single-language** (one title + description per item). Two **independent** packages (not a monorepo — no workspace config), both use **npm** (lockfiles committed, do not switch to pnpm without reason):

- `frontend/` — Vite + React 18 + TypeScript + Tailwind + shadcn/ui (Radix)
- `worker/` — Cloudflare Workers + D1 (SQLite) + KV, TypeScript, no router framework (manual `if`/regex dispatch in `worker/src/index.ts`)

## Developer commands

Run from each package directory (`cd frontend` / `cd worker`).

| Task | Frontend | Worker |
| ---- | -------- | ------ |
| Dev server | `npm run dev` (Vite, :5173) | `npm run dev` (Wrangler, :8787) |
| Build | `npm run build` → `tsc && vite build` | handled by Wrangler on deploy |
| Lint | `npm run lint` (eslint, **`--max-warnings 0`** = strict) | — |
| Typecheck | `tsc --noEmit` (no dedicated script; `build` runs `tsc` first) | `npx tsc` (tsconfig has `noEmit`) |
| Deploy | `npx wrangler pages deploy dist --project-name=feature-voting-frontend` | `npm run deploy` (`wrangler deploy`) |
| Logs | — | `npm run tail` |

**Local dev needs two terminals**: worker (`:8787`) then frontend (`:5173`). Frontend reads `VITE_API_URL` from `.env.local` (copy from `.env.example`).

There is **no test suite** in either package — don't assume `npm test` exists.

## Required command order for changes

`lint` → `tsc --noEmit` → `build` (frontend). Worker: `npx tsc` then `wrangler dev` to smoke-test routes. CI uses Node 20.

## Architecture notes

- **Frontend path alias**: `@/*` → `./src/*` (configured in both `vite.config.ts` and `tsconfig.json`). Prefer `@/` imports over relative.
- **i18n**: `react-i18next` with locale files in `frontend/public/locales/{en,vi,zh}/`. UI labels only — feature content is stored in a single language (no per-language DB fields).
- **Worker routing**: all routes are explicit `path === ...` / `path.match(...)` branches in `worker/src/index.ts:56`. New endpoints must be added there manually — there is no decorator or router file to scan.
- **Worker handlers** are split by domain in `worker/src/handlers/` (features, auth, admin, suggestions, comments, comment-moderation, user-management). DB access goes through `worker/src/db/queries.ts`.
- **D1 binding** is `DB`; **KV binding** is `RATE_LIMIT_KV` (optional — rate limiting degrades gracefully if unset). `Env` interface is defined inline in `worker/src/index.ts:42`.

## Database migrations (D1)

Schema files live in `worker/src/db/`. CI runs them in this order against `--remote` (see `.github/workflows/deploy.yml`):

1. `schema.sql` (base tables)
2. `migration-content-single-language.sql` (collapses content to single title/description)
3. `migration-add-admin-comments.sql`
4. `migration-rbac.sql`
5. `schema-v3.sql` (RBAC tables)

Migrations are **idempotent-safe**: CI greps for `"duplicate column name"` / `"already exists"` (and `"no such column"` for the content migration) and treats them as success. When writing a new migration, use `IF NOT EXISTS` / `INSERT OR IGNORE` so re-runs don't fail. Local DB init: `npx wrangler d1 execute feature-voting-db --file=./src/db/schema.sql`. Note `schema.sql` already declares single-language columns; `migration-content-single-language.sql` only needs to be applied to upgrade a pre-refactor local DB.

## wrangler.toml placeholders

`worker/wrangler.toml` contains `${CF_D1_DATABASE_ID}` and `${CF_KV_NAMESPACE_ID}` placeholders. They are substituted by `worker/update-wrangler-config.sh` during CI (env vars come from GitHub Secrets). **Do not commit real IDs** — local dev uses `.dev.vars` / Wrangler's local D1.

## Environment variables

- **Frontend** (`frontend/.env.local`, Vite-prefixed): `VITE_API_URL` (worker URL), `VITE_RECAPTCHA_SITE_KEY` (reCAPTCHA v3 public key).
- **Worker** non-secret vars are in `wrangler.toml` `[vars]` (`APP_URL`, `RECAPTCHA_SITE_KEY`). **Secrets** are set via `wrangler secret put` or GitHub Secrets: `ADMIN_TOKEN` (deprecated, RBAC now via `admin_emails` table), `RECAPTCHA_SECRET_KEY` (required), `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` (optional), `RESEND_API_KEY` / `SENDGRID_API_KEY` (optional email), `TURNSTILE_SECRET_KEY` (optional).
- reCAPTCHA v3 is **required** in production; if keys are missing the worker skips verification with a warning (graceful degradation, see `worker/src/utils/recaptcha.ts`).

## CI/CD

`.github/workflows/deploy.yml` triggers on push to `main` (and `workflow_dispatch`). Two parallel jobs (`frontend` → Cloudflare Pages, `worker` → Cloudflare Workers) then a Telegram notify job. Worker job runs migrations and sets up admin email from `ADMIN_EMAIL` secret before deploying. Required GitHub Secrets are documented in `README.md`.

## Gotchas

- Markdown files (`*.md`) are **tracked normally** — an accidental `*.md` ignore rule was removed from `.gitignore` (commit `cb952dc`). New `.md` files can be committed with a plain `git add`.
- Frontend `lint` fails on **any** warning (`--max-warnings 0`). Don't leave `eslint-disable` without a justification comment (`--report-unused-disable-directives` is on).
- `frontend/build` runs `tsc` before `vite build` — type errors fail the build, not just the editor.
- Worker `tsconfig.json` has `noEmit: true`; Wrangler bundles directly from source via the `[build] command = "npm install && npx tsc"` in `wrangler.toml` (typecheck-only, no JS output).
- CORS is handled inline (`worker/src/utils/cors.ts`); `OPTIONS` preflight returns early in `index.ts`. Don't strip CORS headers from responses.
- Production domains: frontend `idea.nginxwaf.me`, worker `api.idea.nginxwaf.me` (configured in `wrangler.toml` `routes`).

## Reference docs

- `README.md` — full setup, env var table, API endpoints, GitHub Secrets list
- `RECAPTCHA_SETUP.md` — reCAPTCHA v3 setup & troubleshooting
- `EMAIL_SETUP.md` — Resend / SendGrid configuration
- `README.vi.md` — Vietnamese README (keep in sync with English)
