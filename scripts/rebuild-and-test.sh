#!/bin/bash
# Run build and publish with latest code changes
cd /home/team/shared/site
echo "=== REBUILD START $(date) ===" > /tmp/build-log.txt
bun run build >> /tmp/build-log.txt 2>&1
echo "BUILD EXIT: $?" >> /tmp/build-log.txt
echo "=== BUILD DONE ===" >> /tmp/build-log.txt

# Now test
echo "=== TESTS $(date) ===" >> /tmp/build-log.txt

# db:status without DATABASE_URL
echo "--- db:status (no DATABASE_URL) ---" >> /tmp/build-log.txt
unset DATABASE_URL
bun run db:status >> /tmp/build-log.txt 2>&1
echo "EXIT: $?" >> /tmp/build-log.txt

# API endpoint
echo "--- API /api/db-status ---" >> /tmp/build-log.txt
curl -s http://localhost:3000/api/db-status >> /tmp/build-log.txt 2>&1

# Pages
echo "--- Pages ---" >> /tmp/build-log.txt
for p in / /grandparent /digest /api/db-status; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$p)
  echo "$p -> $code" >> /tmp/build-log.txt
done

echo "=== ALL DONE ===" >> /tmp/build-log.txt
