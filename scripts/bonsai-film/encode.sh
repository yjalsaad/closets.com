#!/usr/bin/env bash
# bash encode.sh <workdir> <outdir>   frames (<workdir>/frames/f%05d.jpg, 24 fps) + <workdir>/music.wav -> bonsai-hub-1080.mp4, bonsai-hub-720.mp4, bonsai-hub-poster.jpg
set -euo pipefail
W=$1; O=$2; mkdir -p "$O"
# 1. loudness: measure, then apply linear gain so the bed is about -16 LUFS integrated, true peak <= -1.5 dBTP
M=$(ffmpeg -hide_banner -i "$W/music.wav" -t 60 -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$M" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
AF="loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,afade=t=in:d=0.4,afade=t=out:st=58.6:d=1.4"
# 2. subtle film grain + warm lift, then H.264 High + AAC, faststart
VF="noise=alls=3:allf=t,format=yuv420p"
ffmpeg -hide_banner -y -framerate 24 -i "$W/frames/f%05d.jpg" -i "$W/music.wav" -t 60 -vf "$VF" -af "$AF" \
  -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 22 -maxrate 3000k -bufsize 6000k -pix_fmt yuv420p -g 48 -r 24 -c:a aac -b:a 128k -ar 48000 -movflags +faststart "$O/bonsai-hub-1080.mp4"
ffmpeg -hide_banner -y -framerate 24 -i "$W/frames/f%05d.jpg" -i "$W/music.wav" -t 60 -vf "noise=alls=2:allf=t,scale=1280:720:flags=lanczos,format=yuv420p" -af "$AF" \
  -c:v libx264 -profile:v high -level 4.0 -preset slow -crf 25 -maxrate 1300k -bufsize 2600k -pix_fmt yuv420p -g 48 -r 24 -c:a aac -b:a 96k -ar 48000 -movflags +faststart "$O/bonsai-hub-720.mp4"
ffmpeg -hide_banner -y -i "$W/frames/f00115.jpg" -vf scale=1280:720:flags=lanczos -q:v 3 "$O/bonsai-hub-poster.jpg"
ls -l "$O"
