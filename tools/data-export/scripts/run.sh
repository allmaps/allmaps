#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd -- "$TOOL_DIR/../.." && pwd)"

echo "Starting Allmaps data export"
date -u
echo "Script directory: $SCRIPT_DIR"
echo "Tool directory: $TOOL_DIR"
echo "Repository directory: $REPO_DIR"
echo "Working directory: $(pwd)"

# =============================================================================
# Georeference Annotations, GeoJSON, etc.
# =============================================================================

echo "Exporting maps and annotations"
pnpm --dir "$REPO_DIR" --filter @allmaps/data-export run export production

# =============================================================================
# PMTiles
# =============================================================================

echo "Creating PMTiles"
pnpm --dir "$REPO_DIR" --filter @allmaps/data-export run pmtiles

# =============================================================================
# Upload to R2 using rclone
# =============================================================================

echo "Uploading export files"
pnpm --dir "$REPO_DIR" --filter @allmaps/data-export run upload

echo "Finished Allmaps data export"
date -u
