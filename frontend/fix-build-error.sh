#!/bin/bash
set -e

echo "=== Fixing Frontend Build Error ==="
echo ""

# Step 1: Clean build artifacts
echo "1. Cleaning build artifacts..."
rm -rf dist/
rm -rf node_modules/.vite
echo "   ✅ Cleaned"

# Step 2: Clear npm cache (optional but can help)
echo ""
echo "2. Clearing npm cache..."
npm cache clean --force 2>/dev/null || echo "   (Skipping cache clear)"
echo "   ✅ Done"

# Step 3: Reinstall dependencies
echo ""
echo "3. Reinstalling dependencies..."
npm ci
echo "   ✅ Dependencies installed"

# Step 4: Rebuild
echo ""
echo "4. Rebuilding frontend..."
VITE_API_URL=${VITE_API_URL:-http://localhost:8080} npm run build
echo ""
echo "   ✅ Build complete!"

# Step 5: Check for build errors
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo ""
  echo "✅ Build successful! Files in dist/:"
  ls -lh dist/ | head -10
else
  echo ""
  echo "❌ Build failed - check errors above"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next steps:"
echo "1. Test locally: npm run preview"
echo "2. If it works, redeploy to S3"
echo ""
