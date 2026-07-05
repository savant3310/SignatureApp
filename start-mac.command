#!/bin/bash
# Animated Signature Studio - macOS launcher (double-click to run)
cd "$(dirname "$0")"
echo "Animated Signature Studio -> http://localhost:8000"
echo "Leave this window open while using the app. Press Ctrl+C to stop."
( sleep 1 && open "http://localhost:8000" ) &
python3 -m http.server 8000
