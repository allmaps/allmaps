#!/bin/sh
# Writes a workerd config for the `wrangler deploy --dry-run` output in $1/worker.
# Run from the worker's directory; env vars are read at runtime with fromEnvironment.
set -eu

out=$1
date=$(sed -n 's/.*"compatibility_date": *"\([^"]*\)".*/\1/p' wrangler.jsonc)
vars="NODE_VERSION USE_CACHE BROWSER_CACHE_HOURS CLOUDFLARE_CACHE_HOURS
  PUBLIC_TILE_SERVER_BASE_URL PUBLIC_TILE_VIEWER_BASE_URL PUBLIC_PREVIEW_BASE_URL
  PUBLIC_VIEWER_BASE_URL PUBLIC_REST_BASE_URL PUBLIC_ANNOTATIONS_BASE_URL
  PUBLIC_LIVE_BASE_URL"

if [ -d public ]; then cp -r public "$out/public"; fi

module() {
  case $1 in
    *.js | *.mjs) type=esModule ;;
    *.wasm | *-wasm) type=wasm ;;
    *) type=data ;;
  esac
  echo "    (name = \"$1\", $type = embed \"worker/$1\"),"
}

cat <<EOF
using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    (name = "main", worker = .worker),
    (name = "internet", network = (
      allow = ["public", "private", "local"],
      tlsOptions = (trustBrowserCas = true),
    )),
$([ -d public ] && echo '    (name = "assets", disk = (path = "/app/public")),')
  ],
  sockets = [(name = "http", address = "*:8080", http = (), service = "main")],
);

const worker :Workerd.Worker = (
  compatibilityDate = "$date",
  compatibilityFlags = ["nodejs_compat"],
  modules = [
$(module index.js
  cd "$out/worker"
  find . -type f ! -name index.js ! -name '*.map' ! -name README.md |
    sed 's#^\./##' | sort | while read -r f; do module "$f"; done)
  ],
  bindings = [
$(for v in $vars; do echo "    (name = \"$v\", fromEnvironment = \"$v\"),"; done)
$([ -d public ] && echo '    (name = "ASSETS", service = "assets"),')
  ],
);
EOF
