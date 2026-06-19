#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Push the enhanced website to GitHub (github.com/yjalsaad/closets.com, main)
#
# Why this script: all of this session's work (AI Designer, chat widget,
# booking flow, AR, per-route SEO, customer auth) currently lives only in the
# working tree + the live Vercel deploy. The git repo's last commit is just
# "Restore before-site". This commits the work and pushes it so GitHub matches
# what's live.
#
# Run it ON YOUR MACHINE (it uses your GitHub login). From a terminal:
#     cd ~/Downloads/closets-hub/closets-website
#     bash push-website-to-github.sh
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")"

echo "▶ Repo:   $(pwd)"
echo "▶ Remote: $(git remote get-url origin)"
echo "▶ Branch: $(git rev-parse --abbrev-ref HEAD)"

# Clear any stale lock from an interrupted git process (safe if none exists).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "  cleared stale .git/index.lock"

# Safety: confirm secrets are NOT about to be committed.
# .env only holds DISABLE_ESLINT_PLUGIN; .env.local (Vercel token) is gitignored.
if git check-ignore -q .env.local; then
  echo "  ✓ .env.local is gitignored (secrets safe)"
else
  echo "  ✗ WARNING: .env.local is NOT ignored — aborting so secrets aren't pushed."
  exit 1
fi

echo "▶ Changes to be committed:"
git add -A
git status -s

echo
read -r -p "Commit and push these to origin/main? [y/N] " ans
[ "${ans:-N}" = "y" ] || [ "${ans:-N}" = "Y" ] || { echo "Aborted."; exit 0; }

git commit -m "Website: AI Designer, AI chat, booking, AR, per-route SEO, secure customer auth

- AI Interior Designer page (real Claude concept generation + package tiers)
- AI support chat widget, product recommendations, lead scoring
- Multi-step booking flow wired to Hub (book_appointment RPC)
- model-viewer AR on product pages
- Per-route SEO, OG/Twitter tags, JSON-LD, sitemap, robots, og-image
- Customer auth via secure customer_login/customer_register RPCs"

git push origin main
echo "✅ Pushed. GitHub now matches the live site."
