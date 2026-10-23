#!/bin/sh
# Development: runs a command once dev-install.sh has installed node_modules.
# When a reinstall starts this script exits, which stops the container and
# everything in it; Docker restarts it, and it waits here for the new install.
set -u

trap 'exit 0' TERM INT

stamp=/state/installed

# compose.yaml leaves it empty unless set, so deployments can't run without one
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-insecure-local-secret}"

until [ -f "$stamp" ]; do sleep 1; done
installed=$(cat "$stamp")

sh -c "$1" &
pid=$!

while kill -0 "$pid" 2>/dev/null; do
  [ "$(cat "$stamp" 2>/dev/null)" = "$installed" ] || exit 0
  sleep 1
done
wait "$pid"
