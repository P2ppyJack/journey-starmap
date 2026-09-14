#!/bin/sh
# Apply only a verified patch package; run from a stopped, isolated checkout.
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "${PYTHON:-python3}" "$HERE/apply.py" "$@"
