#!/bin/bash
# stop.sh - Stop VoxCommand webservice

CDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$CDIR/server.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  echo "Stopping VoxCommand Webservice (PID: $PID)..."
  kill "$PID" 2>/dev/null
  
  # Wait up to 5 seconds for it to exit
  for i in {1..5}; do
    if ! ps -p "$PID" > /dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  
  # Force kill if still running
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Service did not exit cleanly. Force killing (SIGKILL)..."
    kill -9 "$PID" 2>/dev/null
  fi
  
  rm -f "$PID_FILE"
  echo "VoxCommand stopped successfully."
else
  # Fallback: find node process running server.js in this directory
  PID=$(pgrep -f "node $CDIR/server.js")
  if [ -n "$PID" ]; then
    echo "Stopping VoxCommand process found with pgrep (PID: $PID)..."
    kill "$PID" 2>/dev/null
    echo "VoxCommand stopped successfully."
  else
    echo "VoxCommand is not running."
  fi
fi
