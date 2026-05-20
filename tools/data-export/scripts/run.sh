#!/usr/bin/env bash

set -euo pipefail

echo "Starting Allmaps data export"
date -u

# =============================================================================
# Georeference Annotations, GeoJSON, etc.
# =============================================================================

echo "Exporting maps and annotations"
pnpm run export production

# =============================================================================
# PMTiles
# =============================================================================

echo "Creating PMTiles"
pnpm run pmtiles

# =============================================================================
# Upload to R2 using rclone
# =============================================================================

echo "Uploading export files"
pnpm run upload

echo "Finished Allmaps data export"
date -u
