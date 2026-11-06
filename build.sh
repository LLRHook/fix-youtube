#!/usr/bin/env bash
# Compatibility wrapper. Python launches the Rust packager on supported hosts.
set -euo pipefail
cd -- "$(dirname -- "$0")"
exec python3 build.py "$@"
