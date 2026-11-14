#!/usr/bin/env bash
# Re-run the YAS Bloom port (add-only). Usage: scripts/port-yas-bloom.sh [<ref>]   (default origin/claude/web-showroom-3d)
set -euo pipefail
cd "$(dirname "$0")/.."
REF="${1:-origin/claude/web-showroom-3d}"
git fetch -q origin 2>/dev/null || true
git checkout "$REF" -- src/showroom3d docs/showroom3d scripts/showroom3d-qa
# optional add-on paths (present on newer showroom refs): static assets served under /yas-bloom/** and the reproducible asset build scripts
for p in public/yas-bloom scripts/showroom3d-film scripts/showroom3d-profile; do
  if git cat-file -e "$REF:$p" 2>/dev/null; then git checkout "$REF" -- "$p"; fi
done
# main's owner-decided facts (yearsOfCraft=20 in vendor/facts.js) are re-applied to the copied vip.test.js by port-yas-bloom.js (the source asserts 'contested = null')
node scripts/port-yas-bloom.js
echo "now: review 'git status', run the tests + build (docs/showroom3d/ADDON-PORT.md)"
