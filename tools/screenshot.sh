#!/usr/bin/env bash
# 逐个路由无头截图到 tools/shots/
cd "$(dirname "$0")/.." || exit 1
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
[ -x "$EDGE" ] || EDGE="/c/Program Files/Google/Chrome/Application/chrome.exe"
mkdir -p tools/shots
for r in home plan media dev consult fitness diet games settings; do
  "$EDGE" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --user-data-dir="/tmp/edge-wb" --virtual-time-budget=3500 \
    --window-size=1440,950 --screenshot="tools/shots/$r.png" \
    "http://127.0.0.1:5188/#/$r" >/dev/null 2>&1
done
ls -la tools/shots
