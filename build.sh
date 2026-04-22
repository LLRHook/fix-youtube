#!/bin/bash
# Build Fix YouTube for Chrome or Firefox
# Usage: ./build.sh [chrome|firefox]

set -e

TARGET="${1:-chrome}"
DIST="dist-$TARGET"

if [ "$TARGET" != "chrome" ] && [ "$TARGET" != "firefox" ]; then
  echo "Usage: ./build.sh [chrome|firefox]"
  exit 1
fi

rm -rf "$DIST"
mkdir -p "$DIST/icons"

# Copy shared files
cp content.js styles.css popup.html popup.js background.js rules.json \
   dashboard.html dashboard.js "$DIST/"
cp icons/*.png "$DIST/icons/"

# Copy browser-specific manifest
if [ "$TARGET" = "firefox" ]; then
  cp manifest.firefox.json "$DIST/manifest.json"
else
  cp manifest.json "$DIST/manifest.json"
fi

echo "Built for $TARGET → $DIST/"
echo "Load '$DIST' as an unpacked extension in your browser."
