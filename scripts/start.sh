#!/bin/sh
set -e

echo "[voyara] Applying database schema..."
npx prisma db push --skip-generate

echo "[voyara] Seeding demo accounts/listings..."
./node_modules/.bin/tsx prisma/seed.ts

echo "[voyara] Starting app..."
exec node server.js
