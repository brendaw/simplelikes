#!/usr/bin/env bash
set -euo pipefail

WRANGLER_TOML="wrangler.toml"
UUID_PATTERN='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

if [ -f "$WRANGLER_TOML" ]; then
  echo "⚠️  $WRANGLER_TOML already exists."
  read -p "Overwrite it? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
  fi
fi

echo "🔍 Detecting D1 databases..."
D1_LIST=$(npx wrangler d1 list 2>&1)

PROD_DB_ID=$(echo "$D1_LIST" | grep "simplelikes " | grep -oE "$UUID_PATTERN" | head -1)
STAGING_DB_ID=$(echo "$D1_LIST" | grep "simplelikes-staging" | grep -oE "$UUID_PATTERN" | head -1)

if [ -z "$PROD_DB_ID" ]; then
  echo "❌ Database 'simplelikes' not found. Run: npx wrangler d1 create simplelikes"
  exit 1
fi

if [ -z "$STAGING_DB_ID" ]; then
  echo "❌ Database 'simplelikes-staging' not found. Run: npx wrangler d1 create simplelikes-staging"
  exit 1
fi

echo "✅ Production DB: $PROD_DB_ID"
echo "✅ Staging DB:    $STAGING_DB_ID"

echo "📝 Generating $WRANGLER_TOML..."
sed -e "s/__STAGING_DATABASE_ID__/$STAGING_DB_ID/g" \
    -e "s/__PRODUCTION_DATABASE_ID__/$PROD_DB_ID/g" \
    wrangler.toml.example > "$WRANGLER_TOML"
echo "✅ $WRANGLER_TOML created."

echo "🗄️  Applying database schema..."
npm run db:migrate

echo ""
echo "✅ Setup complete!"
echo "   Run 'npm run dev' to start the development server."
echo "   Run 'npm run deploy:staging' for staging deploy."
