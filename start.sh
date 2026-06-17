#!/bin/bash
# start.sh - Start VoxCommand webservice in the background

CDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$CDIR/server.pid"
LOG_FILE="$CDIR/server.log"

# Check if already running
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "VoxCommand is already running with PID $PID."
    exit 0
  fi
fi

echo "Starting VoxCommand Webservice..."
nohup node "$CDIR/server.js" > "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

# Wait a moment for server initialization and certificate generation
sleep 2

# Output the start log to show LAN URLs
if [ -f "$LOG_FILE" ]; then
  cat "$LOG_FILE"
fi

echo "Service started in the background (PID: $NEW_PID)."
