#!/bin/sh
# Commit the named files, then rebase onto the latest main and push.
# A freshness.json clash is rebuilt from the current data. Any other clash stops the publish.
set -eu

message=$1
shift

if [ "$#" -eq 0 ]; then
  echo "No files to publish."
  exit 1
fi

if git diff --quiet -- "$@"; then
  echo "Nothing to publish."
  exit 0
fi

git config user.name "whichai-bot"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add "$@"

if git diff --cached --quiet; then
  echo "Nothing to publish."
  exit 0
fi

git commit -m "$message"

attempt=1
while [ "$attempt" -le 3 ]; do
  git fetch origin main
  if git rebase origin/main; then
    if git push origin HEAD:main; then
      exit 0
    fi
  else
    conflicts=$(git diff --name-only --diff-filter=U || true)
    other=$(printf '%s\n' "$conflicts" | grep -v '^lib/freshness.json$' || true)
    if [ -n "$other" ] || ! printf '%s\n' "$conflicts" | grep -q '^lib/freshness.json$'; then
      echo "Could not rebase onto main:"
      printf '%s\n' "$conflicts"
      exit 1
    fi
    git checkout --ours lib/freshness.json
    node scripts/freshness.mjs
    git add lib/freshness.json
    GIT_EDITOR=true git rebase --continue
    if git push origin HEAD:main; then
      exit 0
    fi
  fi
  attempt=$((attempt + 1))
  sleep 5
done

echo "Could not publish."
exit 1
