#!/bin/bash
set -e

echo "🚀 Setting up Supabase Vector Search..."

npm install
npm run build
npm run type-check

echo ""
echo "✅ Supabase Vector Search setup complete!"
echo "Note: Run 'supabase migration up' to apply database migrations"
