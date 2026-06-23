#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/openclaw/.openclaw/workspace/projects/begood"
PORT="${PORT:-3000}"
# Do not inherit the shell's HOSTNAME=machine-name. Next.js reads HOSTNAME as bind host.
HOSTNAME="${BIND_HOST:-127.0.0.1}"
DATA_DIR="${DATA_DIR:-$APP_DIR/data}"
LOG_DIR="$APP_DIR/runtime"
PID_FILE="$LOG_DIR/begood-prod.pid"
LOG_FILE="$LOG_DIR/begood-prod.log"

mkdir -p "$DATA_DIR" "$LOG_DIR"
cd "$APP_DIR"

load_env() {
  if [ -f "$APP_DIR/.env.local" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$APP_DIR/.env.local"
    set +a
  fi
  export PORT HOSTNAME DATA_DIR
}

is_running() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
}

prepare_standalone_assets() {
  if [ ! -f "$APP_DIR/.next/standalone/server.js" ]; then
    echo "Missing .next/standalone/server.js. Run: npm run build" >&2
    exit 1
  fi
  mkdir -p "$APP_DIR/.next/standalone/.next"
  rm -rf "$APP_DIR/.next/standalone/.next/static"
  cp -a "$APP_DIR/.next/static" "$APP_DIR/.next/standalone/.next/static"
  if [ -d "$APP_DIR/public" ]; then
    rm -rf "$APP_DIR/.next/standalone/public"
    cp -a "$APP_DIR/public" "$APP_DIR/.next/standalone/public"
  fi
}

start() {
  if is_running; then
    echo "BeGood already running pid=$(cat "$PID_FILE")"
    exit 0
  fi
  load_env
  prepare_standalone_assets
  nohup node "$APP_DIR/.next/standalone/server.js" >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  echo "Started BeGood pid=$(cat "$PID_FILE") on $HOSTNAME:$PORT"
}

stop() {
  if is_running; then
    kill "$(cat "$PID_FILE")" || true
    sleep 1
  fi
  rm -f "$PID_FILE"
  echo "Stopped BeGood"
}

restart() {
  stop
  start
}

status() {
  if is_running; then
    echo "running pid=$(cat "$PID_FILE")"
  else
    echo "stopped"
    exit 1
  fi
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  restart) restart ;;
  status) status ;;
  *) echo "Usage: $0 {start|stop|restart|status}" >&2; exit 2 ;;
esac
