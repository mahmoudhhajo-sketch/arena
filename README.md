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
