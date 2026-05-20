#!/usr/bin/env bash

set -euo pipefail

OUTPUT_DIR="${DATA_EXPORT_OUTPUT_DIR:-./data}"
INPUT_PATH="$OUTPUT_DIR/maps-flattened.geojson"
OUTPUT_PATH="$OUTPUT_DIR/maps.pmtiles"

if ! command -v tippecanoe >/dev/null 2>&1; then
  echo "tippecanoe is required to create $OUTPUT_PATH" >&2
  exit 1
fi

if [ ! -f "$INPUT_PATH" ]; then
  echo "Missing input file: $INPUT_PATH" >&2
  echo "Run pnpm --filter @allmaps/data-export run export first." >&2
  exit 1
fi

tippecanoe \
  -f \
  -z14 \
  --simplify-only-low-zooms \
  --full-detail=18 \
  --visvalingam \
  --drop-densest-as-needed \
  --projection=EPSG:4326 \
  -y id \
  -y tileBand \
  -y scale \
  -y area \
  -y modified \
  -y resourceId \
  -y resourceType \
  -y resourceWidth \
  -y resourceHeight \
  -y imageServiceDomain \
  -o "$OUTPUT_PATH" \
  "$INPUT_PATH"
