#!/bin/bash
# Animated Signature Studio - Linux launcher
cd "$(dirname "$0")"
echo "Animated Signature Studio -> http://localhost:8000"
echo "Leave this terminal open while using the app. Press Ctrl+C to stop."
( sleep 1 && xdg-open "http://localhost:8000" >/dev/null 2>&1 ) &
python3 -m http.server 8000
