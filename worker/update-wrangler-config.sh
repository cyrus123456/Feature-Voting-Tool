#!/bin/bash
set -e

echo "🔧 Updating wrangler.toml with environment variables..."

# Substitute resource IDs from environment variables when set.
# When unset, wrangler.toml must already contain real IDs (committed directly).
if [ -n "$CF_D1_DATABASE_ID" ] || [ -n "$CF_KV_NAMESPACE_ID" ]; then
  sed -i.bak "s/\${CF_D1_DATABASE_ID}/${CF_D1_DATABASE_ID:-}/g; s/\${CF_KV_NAMESPACE_ID}/${CF_KV_NAMESPACE_ID:-}/g" wrangler.toml
  rm -f wrangler.toml.bak
  echo "✅ Substituted resource IDs from environment:"
  echo "   D1 Database ID: ${CF_D1_DATABASE_ID:-<unset>}"
  echo "   KV Namespace ID: ${CF_KV_NAMESPACE_ID:-<unset>}"
else
  echo "ℹ️  CF_D1_DATABASE_ID / CF_KV_NAMESPACE_ID not set — using IDs from wrangler.toml as-is."
fi
