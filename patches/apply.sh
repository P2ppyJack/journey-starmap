#!/bin/sh
# Apply the journey star-map feature (Hermes PR #70309) patch set to a
# hermes-agent checkout. Usage:  bash patches/apply.sh   (from anywhere)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d .git ]; then
  echo "error: run this from inside a hermes-agent checkout (no .git here)" >&2
  exit 1
fi

if git apply --3way "$HERE/full.patch"; then
  echo "OK - patch applied (3-way). Verify with the hermes-agent test suite."
else
  echo "3-way apply failed; trying plain apply (may need conflict resolution):" >&2
  git apply "$HERE/full.patch"
  echo "OK - patch applied."
fi
