#!/usr/bin/env bash
# Compatibility wrapper. Python also builds ZIPs on Windows, macOS and Linux.
set -euo pipefail
cd -- "$(dirname -- "$0")"
exec python3 build.py "$@"
