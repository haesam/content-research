#!/usr/bin/env bash
# AI 영상(mp4) → 스크롤 스크럽용 프레임 시퀀스(webp)
# 사용: scripts/extract-frames.sh input.mp4 frames/hero [프레임수=120] [가로폭=1600] [품질=80]
# 결과: frames/hero/frame_001.webp ... 그리고 index.html 의 data-src / data-count 를 맞춰주면 끝.
set -euo pipefail
IN="${1:?input.mp4}"; OUT="${2:?출력 폴더}"; N="${3:-120}"; W="${4:-1600}"; Q="${5:-80}"
command -v ffmpeg >/dev/null || { echo "ffmpeg 가 필요합니다: brew install ffmpeg / winget install ffmpeg"; exit 1; }
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
FPS=$(python3 -c "print(($N-1)/$DUR)" 2>/dev/null || echo "scale=4; ($N-1)/$DUR" | bc)
mkdir -p "$OUT"; rm -f "$OUT"/frame_*.webp
# fps 필터로 균등 샘플링 → 가로폭 리사이즈(짝수 보정) → webp
ffmpeg -hide_banner -loglevel error -i "$IN" \
  -vf "fps=$FPS,scale=$W:-2:flags=lanczos" -frames:v "$N" \
  -c:v libwebp -quality "$Q" -compression_level 6 "$OUT/frame_%03d.webp"
CNT=$(ls "$OUT"/frame_*.webp | wc -l | tr -d ' ')
echo "✔ $CNT frames → $OUT  ($(du -sh "$OUT" | cut -f1))"
echo "  index.html: data-src=\"$OUT/frame_{i}.webp\" data-count=\"$CNT\" data-pad=\"3\""
