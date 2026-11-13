#!/usr/bin/env bash
# Downloads the Mesh2Motion (CC0) human model and push-up clip at a pinned revision.
set -euo pipefail
REVISION=5d6918ef67203e68c661b3e32e8e8f227bfd953e
DEST="${1:?usage: fetch_sources.sh <destination dir>}"
BASE="https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/$REVISION/static/assets/human"
mkdir -p "$DEST"
curl -sfL -o "$DEST/model.glb" "$BASE/model.glb"
curl -sfL -o "$DEST/pushup.glb" "$BASE/animations/pushup.glb"
echo "Mesh2Motion sources saved to $DEST"
