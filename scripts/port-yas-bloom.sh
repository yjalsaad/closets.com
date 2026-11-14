#!/usr/bin/env bash
# Re-run the YAS Bloom port (add-only). Usage: scripts/port-yas-bloom.sh [<ref>]   (default origin/claude/web-showroom-3d)
set -euo pipefail
cd "$(dirname "$0")/.."
REF="${1:-origin/claude/web-showroom-3d}"
git fetch -q origin 2>/dev/null || true
git checkout "$REF" -- src/showroom3d docs/showroom3d scripts/showroom3d-qa
node scripts/port-yas-bloom.js
echo "now: review 'git status', run the tests + build (docs/showroom3d/ADDON-PORT.md)"
