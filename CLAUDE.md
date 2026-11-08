# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies (package-lock.json is gitignored, regenerated on install)
npm run dev           # Dev server (Vite, hot reload)
npm run typecheck     # tsc --noEmit
npm run build         # tsc --noEmit && vite build -> dist/
npm run preview       # Serve the production build locally
npm run deploy        # npm run build && wrangler deploy (requires `wrangler login` or CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID)
```

There is no automated test suite or test runner configured (no `test` script, no Jest/Vitest/Playwright dependency). Verification is `npm run typecheck` + `npm run build`, plus manual/scripted browser checks when needed (e.g. ad-hoc Playwright scripts run outside the repo, never committed).

To run the dev server with Supabase auth/sync active locally, copy `.env.example` to `.env` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from the Supabase project (Project Settings > API). Without them, the app runs local-only (IndexedDB), `isSupabaseConfigured` is `false`, and `AuthGate` shows a "not configured" message instead of the app.

## Architecture

Personal finance tracker (daily/weekly/monthly/yearly), React + TypeScript + Vite, deployed as a static SPA (`HashRouter`, no server-side routing needed — works identically on GitHub Pages, Netlify, or Cloudflare Workers). Local-first: IndexedDB is the source of truth; Supabase (Postgres + Auth) is an optional sync layer, never a required backend.

### Layering (pages never bypass this)

Pages/components never talk to IndexedDB, Supabase, or the financial engine directly — everything routes through one of these service layers:

- **`services/storage`** (`storageService` interface + `indexedDbStorage.ts` implementation) — the only code that touches IndexedDB. A soft-deleted record keeps its row (`deletedAt` set) rather than being removed; "active" reads (`getDay`, `getAllDays`, ...) always filter `deletedAt === undefined`. Deliberately decoupled from `services/auth` and `services/sync` so storage works identically with or without cloud sync wired up.
- **`services/finance`** — `calculateFinancials` and friends. Totals (`gain`, `reste`, affectation prevue/realisee/restante/depassement) are always derived locally from raw achats/ventes/depenses/affectationsRealisees; they are never persisted as synced data and never trusted from a remote source (see sync section).
- **`services/sync`** (`syncService.ts`, `mappers.ts`) — push (local -> Supabase, `upsert` only, never a remote `DELETE`) then pull (Supabase -> local, via `reconcileDays`/`reconcileNotes`/etc. in `indexedDbStorage.ts`), in that order, inside `syncNow()`. Conflict rule across all synced tables: most recent `updatedAt` wins; on an exact tie the remote wins. Manual-only — triggered exclusively by the "Synchroniser maintenant" button on `/compte` (`AccountPage.tsx`); there is no auto-sync anywhere (not on startup, not on a timer, not after CSV import).
- **`services/migration`** (`csvMigrationService.ts`, `formats/registry.ts`) — CSV import. `previewImport()` is read-only (parses + flags per-date conflicts against existing active days via `getDay`); `confirmImport(preview, { conflictResolution })` does the actual writes. A conflicting date is never silently overwritten: the caller must pass `"keep"` or `"replace"`, applied uniformly to every conflicting date in one decision (see `CsvConflictModal`), never a per-row prompt.
- **`services/auth`** (`supabaseClient.ts`, `authService.ts`) — thin wrapper around `@supabase/supabase-js`. `isSupabaseConfigured` is a build-time boolean (`Boolean(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY)`); `supabase` is `null` when unconfigured, and every caller must handle that (no assuming the client exists).

### Deletion safety (soft-delete -> confirmed-synced -> hard purge)

A record is never physically purged from IndexedDB until its deletion is confirmed to have reached Supabase. This is tracked with a local-only field `syncedAt` on `DayEntry`/`Note` (never sent to or read from Supabase): `pushLocalChanges()` stamps `syncedAt = updatedAt` after a successful upsert, and `reconcileDays`/`reconcileNotes` stamp it too when accepting a remote record as-is (it's then trivially already "synced"). `purgeDay`/`purgeNote`/`emptyTrash` only hard-delete a trashed record when `syncedAt >= updatedAt` (or when `isSupabaseConfigured` is false, i.e. there's no remote copy to protect against). `syncNow()` runs an automatic purge sweep at the end of every sync cycle, so a trash-empty done while offline/unsynced completes itself on the next successful sync. This exists specifically to prevent a deleted record from being resurrected by a later pull finding it still active on the remote (see git history around the `syncedAt` introduction for the original incident).

### Auth gating (`AuthGate` + `AuthContext`)

`App.tsx` wraps the entire route tree in `<AuthProvider><AuthGate>...</AuthGate></AuthProvider>`. `AuthGate` does not just hide the app visually while unauthenticated — it does not mount `HashRouter`/`AppShell`/`Routes` at all, so no page's IndexedDB reads can run before a session is confirmed. Four states, in priority order: Supabase not configured -> blocking message (no login form, nothing to log into); initial session check in flight (`loading`) -> loading screen; no session -> `LoginForm`; valid session -> `children`.

`AuthContext`'s initial session check (`authService.getCurrentSession()`) races against an 8s timeout (`SESSION_CHECK_TIMEOUT_MS`), because a network failure (not a clean HTTP error — an actual failed `fetch`) during Supabase's internal token-refresh retry can otherwise leave that promise pending indefinitely, freezing the app on the loading screen. Whichever of {success, error, timeout} happens first flips `loading` to `false` exactly once; an error or timeout is never treated as proof the session is invalid (it never forces `session` to `null`) — if the check or `onAuthStateChange` resolves later, the app unlocks on its own without a fresh login.

### CSV migration

`formats/registry.ts` holds one or more `CsvFormatDetector`s (currently `v2Detaille`, which is also backward-compatible with the older minimal `date,type,libelle,montant` V1 export — a detector matches on header names, not column position or count). `CsvDayEntry.affectationsProvided` distinguishes "CSV had no affectation columns" from "CSV had them, all zero" so that replacing a conflicting day never silently zeroes out affectations the user actually entered in the app when the imported CSV simply didn't carry that data.

### Supabase schema (`supabase/schema.sql`)

Reference SQL, not auto-applied — paste into the Supabase SQL editor when provisioning a project. One table per synced IndexedDB store (`days`, `notes`, `custom_categories`, `settings`, `period_closures`, `objectifs`), each with a `user_id` column and RLS policies scoping every operation to `auth.uid() = user_id`. No `totals`/calculated columns are ever synced.

### Deployment

Primary target is Cloudflare Workers (static assets only, no application Worker — see `wrangler.jsonc`, which runs `bun run build` and serves `dist/`). GitHub Pages and Netlify (`netlify.toml`) also work since the build is pure static output and `HashRouter` needs no server rewrite rules. `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are read by Vite at **build time only** — they must be set as Cloudflare *build* environment variables, not runtime/Worker variables, or the deployed bundle will have them baked in as empty/stale.

### Unrelated content in this repo

`vente-symboles-bibliques/` at the repo root is a standalone static landing page for an unrelated product, merged into `main` by mistake from a different project's history. It shares no code, build step, or dependency with the finance app (own `netlify.toml`/`vercel.json`, plain HTML/CSS/JS). Do not touch it as part of finance-app work, and do not assume anything under it reflects this app's conventions.
