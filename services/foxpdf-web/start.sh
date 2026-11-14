#!/usr/bin/env bash
set -euo pipefail
cd /app/integrity
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --no-access-log &
engine_pid=$!
cd /app/web
bun run server.js &
web_pid=$!
trap 'kill "$engine_pid" "$web_pid" 2>/dev/null || true' EXIT TERM INT
wait -n "$engine_pid" "$web_pid"
exit 1
