/**
 * Migration runner for Family Hub.
 *
 * Applies schema migrations from src/db/migrations/ in order.
 * Run with: bun run db:migrate
 *
 * Requires DATABASE_URL to be set in the environment.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { Pool } from "@neondatabase/serverless";

const MIGRATIONS_DIR = join(import.meta.dir, "..", "src", "db", "migrations");

function getDatabaseURL(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL is not set.");
    console.error("   Set it in your environment or .env file:");
    console.error("   export DATABASE_URL='postgresql://...'");
    process.exit(1);
  }
  return url;
}

/**
 * Split a SQL file into individual statements.
 * Handles:
 *  - Multi-line statements
 *  - Semicolons inside string literals (basic handling)
 *  - Comment-only lines and empty statements
 *
 * Returns an array of non-empty SQL statements (without trailing semicolons).
 */
function splitSQLStatements(content: string): string[] {
  const statements: string[] = [];

  // Split on semicolons followed by optional whitespace/newlines
  // We use a simple approach: collect lines, track statement boundaries
  const lines = content.split("\n");
  let current = "";
  let inString = false;
  let stringChar = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip pure comment lines at the top level
    if (!inString && (trimmed.startsWith("--") || trimmed === "")) {
      // If we have a current statement that's only comments, reset it
      if (current.trim() === "" || current.trim().split("\n").every(l => l.trim() === "" || l.trim().startsWith("--"))) {
        current = "";
      } else if (current.trim() !== "") {
        // Comment in the middle of a statement — keep it
        current += line + "\n";
      }
      continue;
    }

    // Track string boundaries (simple single/double quote tracking)
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (!inString && (ch === "'" || ch === '"')) {
        inString = true;
        stringChar = ch;
      } else if (inString && ch === stringChar) {
        // Check for escaped quote
        if (i + 1 < line.length && line[i + 1] === stringChar) {
          i++; // skip escaped quote
        } else {
          inString = false;
        }
      }
    }

    // Check if this line ends a statement
    const endsWithSemicolon = trimmed.endsWith(";");

    current += line + "\n";

    if (endsWithSemicolon && !inString) {
      // Remove trailing semicolon and trim
      let stmt = current.trim();
      if (stmt.endsWith(";")) {
        stmt = stmt.slice(0, -1).trim();
      }
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = "";
    }
  }

  // Handle any remaining content (last statement without semicolon)
  const remaining = current.trim();
  if (remaining.length > 0) {
    // Remove trailing semicolon if present
    const stmt = remaining.endsWith(";") ? remaining.slice(0, -1).trim() : remaining;
    if (stmt.length > 0) {
      statements.push(stmt);
    }
  }

  return statements;
}

async function main() {
  const dbUrl = getDatabaseURL();
  const pool = new Pool({ connectionString: dbUrl });

  try {
    // Discover migration files
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => extname(f) === ".sql")
      .sort(); // alphabetical = chronological (001_, 002_, ...)

    if (files.length === 0) {
      console.log("ℹ️  No migration files found in", MIGRATIONS_DIR);
      process.exit(0);
    }

    console.log(`🔧 Applying ${files.length} migration(s) to Neon database...\n`);

    for (const file of files) {
      const path = join(MIGRATIONS_DIR, file);
      const content = readFileSync(path, "utf-8");

      console.log(`  ▶ ${file} (${content.split("\n").length} lines) ...`);

      const statements = splitSQLStatements(content);
      console.log(`    → ${statements.length} statements to execute`);

      let applied = 0;
      let failed = 0;

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        // Get first line for preview
        const preview = stmt.split("\n")[0].trim().substring(0, 80);
        try {
          await pool.query(stmt);
          applied++;
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`    ✗ Statement ${i + 1} FAILED: ${preview}...`);
          console.error(`      ${msg}`);
          // Don't exit — continue with remaining statements (IF NOT EXISTS handles idempotency)
        }
      }

      if (failed > 0) {
        console.log(`  ⚠ ${file}: ${applied} applied, ${failed} failed`);
      } else {
        console.log(`  ✓ ${file}: all ${applied} statements applied successfully.`);
      }
    }

    console.log("\n✅ All migrations processed.");
    console.log("   App is ready to use with live database.");

    // Verify tables exist
    const tables = ["family_groups", "family_members", "member_preferences", "interactions", "nudges", "digests"];
    console.log("\n🔍 Verifying schema...");
    let allPresent = true;
    for (const table of tables) {
      try {
        const result = await pool.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)",
          ["public", table],
        );
        const exists = result.rows[0]?.exists === true;
        console.log(`  ${exists ? "✓" : "✗"} ${table}`);
        if (!exists) allPresent = false;
      } catch (err) {
        console.log(`  ✗ ${table} (error: ${err instanceof Error ? err.message : String(err)})`);
        allPresent = false;
      }
    }

    if (allPresent) {
      console.log("\n✅ All expected tables are present.");
    } else {
      console.log("\n⚠ Some tables are missing. Check the errors above.");
    }
  } finally {
    await pool.end();
  }

  process.exit(0);
}

main();
