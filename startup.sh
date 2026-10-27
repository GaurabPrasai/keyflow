#!/usr/bin/env bash
#
# Keyflow — start everything locally from the repo root.
#
#   ./startup.sh              backend (:8000) + frontend (:5173)
#   ./startup.sh backend      backend only
#   ./startup.sh frontend     frontend only
#
# Works in Git Bash on Windows and on macOS/Linux. Ctrl+C stops both.

set -u

MODE="${1:-all}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
BACK_PID=""
FRONT_PID=""

stop() {
  trap - EXIT INT TERM
  for pid in "$FRONT_PID" "$BACK_PID"; do
    [ -n "$pid" ] || continue
    command -v pkill >/dev/null 2>&1 && pkill -TERM -P "$pid" 2>/dev/null
    kill -TERM "$pid" 2>/dev/null
  done
  sleep 1
  # Fallback (Windows): the Django reloader and Vite keep children of their
  # own, so make sure the two ports really are free again.
  free_port 5173
  free_port 8000
  echo
  echo "keyflow: stopped"
}
trap stop EXIT INT TERM

# Kill whatever still listens on a port (taskkill //T takes the whole tree).
free_port() {
  command -v taskkill >/dev/null 2>&1 || return 0
  command -v netstat >/dev/null 2>&1 || return 0
  local pid
  pid=$(netstat -ano 2>/dev/null | awk -v p=":$1$" '$4 == "LISTENING" && $2 ~ p {print $NF; exit}')
  [ -n "$pid" ] && taskkill //F //T //PID "$pid" >/dev/null 2>&1
}

start_backend() {
  local venv="$ROOT/backend/venv"
  if [ ! -f "$venv/bin/python" ] && [ ! -f "$venv/Scripts/python.exe" ]; then
    echo "keyflow: creating virtualenv"
    python -m venv "$venv"
  fi
  local py="$venv/bin/python"
  [ -f "$py" ] || py="$venv/Scripts/python.exe"

  echo "keyflow: installing python deps"
  "$py" -m pip install -q -r "$ROOT/backend/requirements.txt"
  [ -f "$ROOT/backend/.env" ] || cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  echo "keyflow: migrating"
  "$py" "$ROOT/backend/manage.py" migrate --noinput

  echo "keyflow: api  → http://localhost:8000/api/health/"
  ( cd "$ROOT/backend" && exec "$py" manage.py runserver 8000 ) &
  BACK_PID=$!
}

start_frontend() {
  if [ ! -d "$ROOT/frontend/node_modules" ]; then
    echo "keyflow: npm install"
    ( cd "$ROOT/frontend" && npm install )
  fi
  echo "keyflow: app  → http://localhost:5173"
  ( cd "$ROOT/frontend" && exec ./node_modules/.bin/vite ) &
  FRONT_PID=$!
}

case "$MODE" in
  backend) start_backend ;;
  frontend) start_frontend ;;
  *) start_backend; start_frontend ;;
esac

echo
echo "keyflow: Vite proxies /api to Django, so open http://localhost:5173"
echo "keyflow: Ctrl+C stops everything"
wait
