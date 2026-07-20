/**
 * Quick DB status check script.
 * Run with: bun run db:status
 *
 * Reports whether DATABASE_URL is set and whether the database is reachable
 * with a properly migrated schema.
 */
import { hasDatabaseURL, checkDatabaseConnection } from "../src/db";

console.log("🔍 Family Hub — Database Status\n");

// 1. Check env var
if (hasDatabaseURL()) {
  const url = process.env.DATABASE_URL!;
  const masked = url.replace(/\/\/.*@/, "//****:****@");
  console.log("✓ DATABASE_URL is set:", masked);
} else {
  console.log("✗ DATABASE_URL is NOT set.");
  console.log("  The app will run in fallback mode with mock data.");
  console.log("  Set DATABASE_URL and run `bun run db:migrate` to switch to live mode.\n");
  process.exit(0);
}

// 2. Check connectivity
const result = await checkDatabaseConnection();
if (result.ok) {
  console.log("✓ Database is reachable and schema is present.");
  console.log("  App is ready to run in live database mode.\n");
  process.exit(0);
} else {
  console.log("✗", result.error);
  process.exit(1);
}
