#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Running database seeding..."
npx prisma db seed

echo "Starting backend server..."
exec npm run dev