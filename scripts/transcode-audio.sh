#!/usr/bin/env bash
# Transcode the LANDR WAV masters in songs/ to lossless FLAC + web MP3 in audio/.
# Also prints each track's duration (seconds) to seed data/songs.js.
# Requires ffmpeg + ffprobe. Run from project root: bash scripts/transcode-audio.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p audio

# wav-basename (without .wav)  ->  output slug
map() {
  cat <<'EOF'
LANDR-01 The First Loneliness-Warm-Medium=first-loneliness
LANDR-02 Ignis Dualis-Warm-Medium=ignis-dualis
LANDR-03 Amor Perfectus Est Carcer-Warm-Medium=amor-perfectus-est-carcer
LANDR-04 The Litany of Ophelia-Warm-Medium=litany-of-ophelia
LANDR-05 The Savior That Never Was-Warm-Medium=saviour-that-never-was
LANDR-06 The Recursion of Ash and Lightning-Warm-Medium=recursion-of-ash-and-lightning
LANDR-07 The Harvest of Inkblood-Warm-Medium=harvest-of-inkblood
LANDR-08 The Incomplete Liturgy-Warm-Medium=incomplete-liturgy
LANDR-10 Symphony of Sadeness-Warm-Medium=symphony-of-sadeness
EOF
}

map | while IFS='=' read -r base slug; do
  src="songs/${base}.wav"
  [ -f "$src" ] || { echo "  MISSING  $src"; continue; }
  ffmpeg -y -loglevel error -i "$src" -c:a flac -compression_level 8 "audio/${slug}.flac"
  ffmpeg -y -loglevel error -i "$src" -c:a libmp3lame -q:a 2 "audio/${slug}.mp3"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  printf '  ok  %-34s dur=%.2f\n' "$slug" "$dur"
done
