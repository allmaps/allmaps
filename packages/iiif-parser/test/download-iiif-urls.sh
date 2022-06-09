#!/usr/bin/env bash

yq ./iiif-urls.yaml -o=json  | jq -r '.[]|[.url, .filename, .type, .version] | @tsv' |
while IFS=$'\t' read -r url filename type version; do
  wget -O - "$url" \
    | npx prettier --stdin-filepath "$filename.json" \
    > "./input/$type.$version.$filename.json"
done
