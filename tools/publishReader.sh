#!/bin/sh
# The reader page built and pushed as the only file of the gh-pages branch,
# which GitHub Pages serves. The entries never go there: only the page.
set -e
cd "$(dirname "$0")/.."
npm run build:reader
out=tools/out/gh-pages
rm -rf "$out"
git worktree prune
if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git fetch origin gh-pages
  git worktree add -f "$out" origin/gh-pages --detach
else
  git worktree add -f --detach "$out" HEAD
  git -C "$out" checkout --orphan gh-pages-new
  git -C "$out" rm -rfq .
fi
cp dist-reader/index.html "$out/index.html"
touch "$out/.nojekyll"
git -C "$out" add index.html .nojekyll
git -C "$out" commit -qm "reader from $(git rev-parse --short HEAD)" || echo "the page is unchanged"
git -C "$out" push origin HEAD:refs/heads/gh-pages
git worktree remove --force "$out"
