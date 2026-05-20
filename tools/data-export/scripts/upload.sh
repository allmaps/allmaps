#!/usr/bin/env bash

set -euo pipefail

OUTPUT_DIR="${DATA_EXPORT_OUTPUT_DIR:-./data}"
R2_DESTINATION="${DATA_EXPORT_R2_DESTINATION:-r2:allmaps-files}"

if [[ "$R2_DESTINATION" == http://* || "$R2_DESTINATION" == https://* ]]; then
  echo "DATA_EXPORT_R2_DESTINATION must be an rclone destination like r2:allmaps-files, not an endpoint URL." >&2
  echo "Put the Cloudflare R2 endpoint URL in RCLONE_CONFIG_R2_ENDPOINT instead." >&2
  exit 1
fi

rclone --config="./config/rclone.conf" copy "$OUTPUT_DIR" "$R2_DESTINATION"
