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


## Match start and email

Only scheduled matches wait for launch on Railway. Market, chat, scouting,
training, doctors, wages and magic operate immediately. Local worlds are unchanged.
Set ARENA_LAUNCH_AT only when the owner explicitly requests match start. The next
worker rebases unplayed fixture dates once: Fri–Mon -> Tue; Tue–Thu -> Fri,
19:00 Europe/Stockholm. It does not reset other game clocks or auction deadlines.

Registration stores a private email and queues both a welcome letter and a notice
to mahmoudhhajo@gmail.com. Contact forms queue mail there too, with the manager's
email as Reply-To. Configure GMAIL_APP_PASSWORD in Railway to send through Gmail
SMTP/TLS (requires Railway Pro). Never put credentials in chat or Git.
Alternatively configure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and
GMAIL_REFRESH_TOKEN for Gmail API over HTTPS. The outbox survives deployment and
retries failures hourly, up to five attempts. Real delivery requires credentials.

The isolated tests in tests/launch.integration.ts use LOCAL_DB_DIR=:memory:,
PUBLIC_ORIGIN=https://arena-test.invalid and ALLOW_SIGNUPS=true.
