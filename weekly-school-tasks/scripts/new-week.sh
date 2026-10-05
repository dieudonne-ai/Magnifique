#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
week="${1:-$(date +%G-W%V)}"
dest="$root/weeks/$week"
[ -e "$dest" ] && { echo "$dest already exists" >&2; exit 1; }
cp -r "$root/template" "$dest"
sed -i "s/WEEK_ID/$week/" "$dest/README.md"
echo "Created $dest"
