#!/bin/sh
set -e

node /app/scripts/wait-for-db.mjs
# Refuses (exit 1) when existing tables do not match the baseline; set -e stops the boot.
node /app/scripts/baseline-migrations.mjs
echo "[entrypoint] Applying migrations..."
npx drizzle-kit migrate
# First admin from SEED_ADMIN_* when the users table is empty (otherwise: /setup).
node /app/scripts/seed.mjs
exec node /app/.output/server/index.mjs
