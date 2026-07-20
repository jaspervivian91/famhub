# Family Hub

A private, AI-powered connection platform that strengthens specific family relationships — the opposite of social media.

Instead of broadcasting, Family Hub uses metadata-only analysis (interaction frequency, recency, initiation patterns) to detect when family members are drifting apart and nudges them toward real-world reconnection. The app succeeds when families put their phones down.

## Tech Stack

- **Frontend**: TanStack Start (React + Vite + Tailwind CSS)
- **Backend**: TanStack Start SSR with custom server entry
- **Database**: Neon Postgres (serverless) with `@neondatabase/serverless`
- **Runtime**: Bun

## Getting Started

```bash
bun install
bun run publish    # builds and serves on port 3000
```

Without `DATABASE_URL`, the app runs in **fallback mode** with mock data. To connect a real database:

```bash
export DATABASE_URL='postgresql://...'
bun run db:migrate   # apply schema
bun run db:status    # verify connectivity
bun run publish      # rebuild with live DB
```

See [RUNBOOK.md](./RUNBOOK.md) for the full cutover guide.

## Project Structure

```
src/
  routes/           # File-based routing (TanStack Start)
    __root.tsx      # Root layout
    index.tsx       # Landing page (/)
    grandparent.tsx # Grandparent simplified mode (/grandparent)
    digest.tsx      # Weekly digest (/digest)
    group/$groupId.tsx   # Family group detail
    join/$inviteCode.tsx # Join by invite code
  components/       # Shared UI components
  lib/              # Business logic (privacy-first, metadata-only)
  db/               # Database helpers and migrations
  server.ts         # Custom server entry (DB health checks, API routes)
scripts/            # CLI tools (migrate, db-status, testing)
```

## Privacy

Family Hub is privacy-first by design:
- **Metadata-only analysis**: never reads or stores message content
- Only tracks interaction frequency, recency, and initiation patterns
- GDPR/COPPA compliant from day one
- No advertising, no data selling
