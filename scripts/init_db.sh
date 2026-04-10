#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set."
  echo "Example:"
  echo "  export DATABASE_URL='postgresql://user:pass@host:5432/dbname?sslmode=require'"
  exit 1
fi

SEED_DATA=false
if [[ "${1:-}" == "--seed" ]]; then
  SEED_DATA=true
fi

echo "Applying schema..."
psql "$DATABASE_URL" -f database/schema.sql

echo "Applying triggers..."
psql "$DATABASE_URL" -f database/triggers.sql

echo "Applying procedures..."
psql "$DATABASE_URL" -f database/procedures.sql

if [[ "$SEED_DATA" == "true" ]]; then
  echo "Applying seed + queries..."
  psql "$DATABASE_URL" -f database/queries.sql
else
  echo "Skipping seed + queries. Pass --seed to include demo seed data."
fi

echo "Database initialization completed successfully."
