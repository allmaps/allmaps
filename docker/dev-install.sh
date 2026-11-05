#!/bin/sh
# Development: installs and builds at startup and whenever pnpm-lock.yaml
# changes. /state/installed holds the lockfile hash node_modules matches;
# removing it stops every service running through dev-run.sh until it is back.
set -u

stamp=/state/installed
installed=
failed=

# $SITE is the public URL with {} for the service name
url() { echo "$SITE" | sed "s/{}/$1/"; }

# Node, not curl: curl sends every *.localhost name to 127.0.0.1 itself
ready() {
  node -e 'fetch(process.argv[1]).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))' "$1"
}

announce() {
  tries=0
  until ready "$(url editor)" || [ $tries -ge 90 ]; do
    tries=$((tries + 1))
    sleep 2
  done
  cat <<EOF

  Allmaps is running:

    Editor        $(url editor)
    Viewer        $(url viewer)
    Console       $(url console)
    REST API      $(url api)
    Annotations   $(url annotations)
    Tile Server   $(url tiles)
    Preview       $(url preview)

EOF
}

rm -f "$stamp"

while :; do
  lockfile=$(sha256sum pnpm-lock.yaml)
  if [ "$lockfile" != "$installed" ] && [ "$lockfile" != "$failed" ]; then
    rm -f "$stamp"
    sleep 3
    if pnpm install --frozen-lockfile --store-dir /pnpm-store &&
      pnpm turbo run build --filter './packages/**' --filter './apis/**'; then
      installed=$lockfile
      echo "$lockfile" > "$stamp"
      announce
    else
      failed=$lockfile
      echo 'Install failed; fix it, then change pnpm-lock.yaml or restart this service'
    fi
  fi
  sleep 2
done
