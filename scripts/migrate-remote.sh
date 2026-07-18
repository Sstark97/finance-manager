#!/bin/sh
# Applies pending Drizzle migrations to the remote Turso database.
# drizzle-kit does not auto-load .env.local (only Next.js does), so this
# script loads it explicitly before delegating to drizzle-kit migrate.
set -e
set -a
. ./.env.local
set +a

if [ -z "$TURSO_DATABASE_URL" ]; then
  echo "TURSO_DATABASE_URL is not set in .env.local — aborting." >&2
  exit 1
fi

echo "Applying migrations to $TURSO_DATABASE_URL"
exec drizzle-kit migrate
