#!/usr/bin/env bash
# Re-run the YAS Bloom port (add-only). Usage: scripts/port-yas-bloom.sh [<ref>]   (default origin/claude/web-showroom-3d)
set -euo pipefail
cd "$(dirname "$0")/.."
REF="${1:-origin/claude/web-showroom-3d}"
git fetch -q origin 2>/dev/null || true
git checkout "$REF" -- src/showroom3d docs/showroom3d scripts/showroom3d-qa
# main's owner-decided facts (yearsOfCraft=20, vendor/facts.js) mean the source's 'contested = null' assertions no longer hold: keep main's own vip.test.js
git checkout origin/main -- src/showroom3d/__tests__/vip.test.js 2>/dev/null || true
node scripts/port-yas-bloom.js
echo "now: review 'git status', run the tests + build (docs/showroom3d/ADDON-PORT.md)"
