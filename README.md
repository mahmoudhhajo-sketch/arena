# Arena – Yaraaz Vigil

Swedish fantasy sports manager. React/TypeScript, Express, Drizzle and PostgreSQL.
Local development uses PGlite; only one process may open the local database.

## Local development

Node.js 22 and pnpm 11.19.0. Run `pnpm install --frozen-lockfile`, then `pnpm dev`.
Build: `npm run build`. Start: `npm start`. Type check: `npm run lint`.

## Railway

The Dockerfile builds both frontend and server, and checks TypeScript.
Configure one continuously running replica with:

- DATABASE_URL referencing the Postgres service.
- NODE_ENV=production
- PORT=3000, matching the public domain target port.
- ALLOW_SIGNUPS=true for the new test world.
- A generated domain. PUBLIC_ORIGIN defaults to its HTTPS address.
- Health check /api/health, timeout 300 seconds for first world creation.

Schema migrations and initial world generation run automatically under a database
lock. Existing worlds are preserved. Match/calendar work uses a cross-process lock
against deployment overlap. An empty database starts a new world with bot clubs.
Managers register on the login page. Local simulated dates and accounts stay local.

Enable persistent PostgreSQL volume backups in Railway and verify restores.
External database filesystem backups require an explicit persistent ARENA_BACKUP_DIR.
Never commit databases, credentials or backups.

## Publishing updates

Work on this repository in Codex, test, commit and push to main. Railway's GitHub
connection automatically builds and deploys main. Deploy code without replacing
production game data with a local test database.


## Controlled opening of the hosted world

Railway worlds wait for an explicit start by default. Accounts and clubs can be
created and formations prepared, but simulation, auctions and other game actions
are held. Local test worlds retain their existing behavior. For isolated tests,
set ARENA_REQUIRE_LAUNCH=true.

Only after the owner explicitly requests launch, set ARENA_LAUNCH_AT to the agreed
ISO timestamp in Railway. Never set this variable as part of ordinary deployment.
The first worker after that time rebases all unplayed fixture dates once, preserving
pairings. Friday through Monday starts lead to Tuesday; Tuesday through Thursday
starts lead to Friday. Kickoff is 19:00 Europe/Stockholm, including DST changes.
Calendar updates begin at launch; no paused weeks are billed retroactively.
Open auctions retain their remaining time (at least one day).

## Welcome email (Google connection required)

Registration stores a private email address and an outbox message atomically.
Gmail delivery is inactive until server-only GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET
and GMAIL_REFRESH_TOKEN are configured for mahmoudhhajo@gmail.com. Use Google's
OAuth authorization with only gmail.send permission and offline access. Never
commit tokens or send them through chat. Trial Railway blocks SMTP, so app
passwords cannot be used here. The Gmail API uses HTTPS. Failed deliveries retry
hourly up to five times, and pending messages survive deployment. Inspect
mail-outbox records for delivery status. Google authentication has not yet been
connected or tested against the real mailbox.

Integration test (isolated database): set LOCAL_DB_DIR=:memory:,
PUBLIC_ORIGIN=https://arena-test.invalid and ALLOW_SIGNUPS=true, then run
`node --import tsx tests/launch.integration.ts`.
