#!/bin/bash
# Build the Kirtos native input helper.
# Usage: ./build.sh [debug|release]
set -euo pipefail

cd "$(dirname "$0")"

MODE="${1:-release}"

echo "Building kirtos-input-helper ($MODE)..."

if [ "$MODE" = "release" ]; then
    swift build -c release 2>&1
    BINARY=".build/release/kirtos-input-helper"
else
    swift build 2>&1
    BINARY=".build/debug/kirtos-input-helper"
fi

if [ -f "$BINARY" ]; then
    echo "✓ Built: $(realpath "$BINARY")"
    echo "  Size: $(du -h "$BINARY" | cut -f1)"
else
    echo "✗ Build failed"
    exit 1
fi
