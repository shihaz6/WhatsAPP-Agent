#!/usr/bin/env bash
# Prepares the six Google Flow clips for Remotion:
#  - drops every audio stream (the reel's sound is all synthesized)
#  - motion-interpolates 24fps -> 60fps so slowed sections (down to ~0.5x) stay smooth at 30fps
#  - keyframe every 6 frames so Remotion can seek quickly
# Source clips are read from the repo root (1.mp4 ... 6.mp4) and are never modified.
set -euo pipefail
cd "$(dirname "$0")/.."
for i in 1 2 3 4 5 6; do
  ffmpeg -v error -y -i "../$i.mp4" -an \
    -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,format=yuv420p" \
    -c:v libx264 -preset slow -crf 14 -g 6 -movflags +faststart "public/clips/shot$i.mp4"
  echo "shot$i done"
done
