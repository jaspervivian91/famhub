# Family Hub — Operator Runbook

Quick-start guide for deploying, running, and troubleshooting Family Hub.

## Required Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | No* | Neon Postgres connection string. Without it, the app runs in **fallback mode** with mock data. |

*\*Fallback mode is fully functional for demos/previews. All pages render with mock data, but write operations (creating groups, joining, recording interactions) will show a friendly error message instructing the operator to set DATABASE_URL.*

Format:
```
postgresql://user:password@host/dbname?sslmode=require
```

Copy `.env.example` to `.env` and fill in your value. The `.env` file is gitignored.

## Quick Start (Fallback Mode — No Database)

```bash
cd /home/team/shared/site
bun run build          # build the app
bun run publish        # start serving on port 3000
```

The app is now live at `http://localhost:3000`. All pages render with mock data.

## Database Cutover (When DATABASE_URL Arrives)

### Step 1: Set the environment variable

```bash
export DATABASE_URL='postgresql://...'
# Or add it to .env (recommended):
echo "DATABASE_URL=postgresql://..." > .env
```

### Step 2: Verify connectivity

```bash
bun run db:status
```

Expected output when DB is reachable but schema not yet applied:
```
✓ DATABASE_URL is set: postgresql://****:****@...
✗ Database is reachable but schema has not been applied. Run `bun run db:migrate`.
```

### Step 3: Run migrations

```bash
bun run db:migrate
```

This applies `src/db/migrations/001_schema.sql` (and any future migration files) to create all tables, indexes, and constraints. Expected output:
```
🔧 Applying 1 migration(s) to Neon database...

  ▶ 001_schema.sql ...
  ✓ 001_schema.sql applied successfully.

✅ All migrations applied successfully.
   App is ready to use with live database.

🔍 Verifying schema...
  ✓ family_groups
  ✓ family_members
  ✓ member_preferences
  ✓ interactions
  ✓ nudges
  ✓ digests
```

### Step 4: Verify database connectivity from the app

```bash
bun run db:status
```

Expected output:
```
✓ DATABASE_URL is set: postgresql://****:****@...
✓ Database is reachable and schema is present.
  App is ready to run in live database mode.
```

Also check the API endpoint:
```bash
curl -s http://localhost:3000/api/db-status | python3 -m json.tool
```

Expected:
```json
{
    "database": "connected",
    "hasDatabaseURL": true,
    "detail": "Schema is applied and reachable."
}
```

### Step 5: Publish with live DB

```bash
bun run publish
```

The app rebuilds and restarts with database access. Write operations (create group, join, record interactions) now persist to Neon.

## Verification Checklist (After Cutover)

- [ ] `bun run db:status` shows "Database is reachable and schema is present"
- [ ] `curl http://localhost:3000/api/db-status` returns `"database": "connected"`
- [ ] `bun run build` succeeds without errors
- [ ] `bun run publish` starts the server cleanly
- [ ] Visiting the app at `http://localhost:3000` shows the dashboard
- [ ] Creating a family group works (no "database is not connected" error)
- [ ] Joining a family group with an invite code works
- [ ] Grandparent mode loads at `/grandparent`

## Commands Reference

| Command | Description |
|---|---|
| `bun run build` | Build the app (always safe, no DB needed) |
| `bun run publish` | Build + start serving on port 3000 |
| `bun run db:migrate` | Apply schema to Neon database (requires DATABASE_URL) |
| `bun run db:status` | Check DB connectivity and schema status |
| `bun run go-live` | Deploy to Vercel (pass DATABASE_URL in environment) |

## Architecture Notes

- **Privacy-first**: Interactions store only metadata (type, timestamps, member refs). Message content is never stored.
- **Fallback mode**: When DATABASE_URL is missing, read operations return mock data and write operations return clear error messages. The UI always renders.
- **Migration safety**: Migrations use `if not exists` — safe to re-run.
- **Serverless DB driver**: Uses `@neondatabase/serverless` which connects over HTTP (no connection pooling needed).
