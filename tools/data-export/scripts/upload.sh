#!/usr/bin/env bash

set -euo pipefail

OUTPUT_DIR="${DATA_EXPORT_OUTPUT_DIR:-./data}"
R2_DESTINATION="${DATA_EXPORT_R2_DESTINATION:-r2:allmaps-files}"

rclone --config="./config/rclone.conf" copy "$OUTPUT_DIR" "$R2_DESTINATION"
