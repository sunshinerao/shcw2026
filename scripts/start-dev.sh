#!/bin/sh

set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
TMP_ROOT=${TMPDIR:-/tmp}
PROJECT_HASH=$(printf '%s' "$PROJECT_DIR" | shasum | awk '{print $1}')
DEV_CACHE_DIR="${TMP_ROOT%/}/shcw2026-next-dev/${PROJECT_HASH}"

mkdir -p "$DEV_CACHE_DIR"
rm -rf "$DEV_CACHE_DIR"/*

if [ -L "$PROJECT_DIR/.next" ] || [ -e "$PROJECT_DIR/.next" ]; then
  rm -rf "$PROJECT_DIR/.next"
fi

ln -s "$DEV_CACHE_DIR" "$PROJECT_DIR/.next"

cleanup() {
  if [ -L "$PROJECT_DIR/.next" ]; then
    rm -f "$PROJECT_DIR/.next"
  fi
}

trap cleanup EXIT INT TERM

cd "$PROJECT_DIR"
export NODE_PATH="$PROJECT_DIR/node_modules${NODE_PATH:+:$NODE_PATH}"
exec next dev "$@"