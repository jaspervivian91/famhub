#!/bin/bash
cd /home/team/shared/site
echo "=== db:status test ===" > /tmp/test-results.txt
unset DATABASE_URL
bun run db:status >> /tmp/test-results.txt 2>&1
echo "EXIT: $?" >> /tmp/test-results.txt
echo "" >> /tmp/test-results.txt
echo "=== API test ===" >> /tmp/test-results.txt
curl -s http://localhost:3000/api/db-status >> /tmp/test-results.txt 2>&1
echo "" >> /tmp/test-results.txt
echo "=== Page tests ===" >> /tmp/test-results.txt
for p in / /grandparent /digest; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$p)
  echo "$p -> $code" >> /tmp/test-results.txt
done
echo "DONE" >> /tmp/test-results.txt
