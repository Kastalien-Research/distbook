#!/usr/bin/env bash
set -euo pipefail
# Symlink the parent repo's `docs/` into the eval-harness worktree so tests can
# find docs/discovery/ and docs/spec/. The parent's docs/ is gitignored
# (see line 46 of .gitignore), so this is required after a fresh worktree
# checkout. Idempotent.
#
# Assumes the worktree lives at <parent>/.claude/worktrees/<name>/.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PARENT="$(cd "$WORKTREE_ROOT/../../.." && pwd)"

if [ -e "$WORKTREE_ROOT/docs" ]; then
  echo "docs/ already present at $WORKTREE_ROOT/docs"
  exit 0
fi

if [ ! -d "$PARENT/docs" ]; then
  echo "Error: parent repo's docs/ not found at $PARENT/docs" >&2
  echo "This script is intended to run from a worktree at <parent>/.claude/worktrees/<name>/." >&2
  exit 1
fi

ln -s "$PARENT/docs" "$WORKTREE_ROOT/docs"
echo "Linked $PARENT/docs -> $WORKTREE_ROOT/docs"
