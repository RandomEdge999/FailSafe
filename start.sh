#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env"
  set +a
fi

API_PORT="${ORCHESTRATOR_API_PORT:-4000}"
WEB_PORT="${STUDIO_WEB_PORT:-3000}"
HOST="${HOST:-0.0.0.0}"
DISPLAY_HOST="${DISPLAY_HOST:-localhost}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/.tmp-start}"
RUN_CHECKS="${RUN_CHECKS:-1}"

export ORCHESTRATOR_API_PORT="$API_PORT"
export STUDIO_WEB_PORT="$WEB_PORT"
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:$API_PORT}"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

API_PID=""
WEB_PID=""
CLEANED_UP=0

log() {
  printf '\n[start] %s\n' "$*"
}

fail() {
  printf '\n[start] ERROR: %s\n' "$*" >&2
  exit 1
}

require_number() {
  local name="$1"
  local value="$2"

  case "$value" in
    ''|*[!0-9]*)
      fail "$name must be a numeric port, got '$value'."
      ;;
  esac
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

run_pnpm() {
  pnpm "$@"
}

kill_process_tree() {
  local pid="${1:-}"

  if [[ -z "$pid" ]]; then
    return 0
  fi

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi

  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "\
      \$ErrorActionPreference='SilentlyContinue'; \
      \$root=$pid; \
      \$children = Get-CimInstance Win32_Process | Where-Object { \$_.ParentProcessId -eq \$root } | Select-Object -ExpandProperty ProcessId; \
      foreach (\$child in \$children) { Stop-Process -Id \$child -Force }; \
      Stop-Process -Id \$root -Force" >/dev/null 2>&1 || true
    return 0
  fi

  if command -v pkill >/dev/null 2>&1; then
    pkill -TERM -P "$pid" >/dev/null 2>&1 || true
  fi

  kill -TERM "$pid" >/dev/null 2>&1 || true

  for _ in {1..20}; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.1
  done

  if command -v pkill >/dev/null 2>&1; then
    pkill -KILL -P "$pid" >/dev/null 2>&1 || true
  fi

  kill -KILL "$pid" >/dev/null 2>&1 || true
}

kill_port() {
  local port="$1"
  local killed=0

  if command -v lsof >/dev/null 2>&1; then
    while IFS= read -r pid; do
      if [[ -n "$pid" ]]; then
        kill_process_tree "$pid"
        killed=1
      fi
    done < <(lsof -ti "tcp:$port" 2>/dev/null || true)
  fi

  if [[ "$killed" -eq 0 ]] && command -v powershell.exe >/dev/null 2>&1; then
    if powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "\
      \$ErrorActionPreference='SilentlyContinue'; \
      \$owners = Get-NetTCPConnection -LocalPort $port -State Listen | Select-Object -ExpandProperty OwningProcess -Unique; \
      if (-not \$owners) { exit 1 }; \
      foreach (\$owner in \$owners) { Stop-Process -Id \$owner -Force }; \
      exit 0" >/dev/null 2>&1; then
      killed=1
    fi
  fi

  if [[ "$killed" -eq 1 ]]; then
    log "Cleared listener on port $port."
  fi
}

port_is_listening() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1 &&
    lsof -ti "tcp:$port" >/dev/null 2>&1; then
    return 0
  fi

  if command -v powershell.exe >/dev/null 2>&1 &&
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "\
      if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { exit 0 }; \
      exit 1" >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local port="${url##*:}"
  port="${port%%/*}"

  for _ in {1..80}; do
    if command -v curl >/dev/null 2>&1 &&
      curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      log "$label is ready at $url."
      return 0
    fi

    if node -e "fetch(process.argv[1]).then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" "$url" >/dev/null 2>&1; then
      log "$label is ready at $url."
      return 0
    fi

    if [[ "$port" =~ ^[0-9]+$ ]] && port_is_listening "$port"; then
      log "$label is listening at $url."
      return 0
    fi

    sleep 0.5
  done

  fail "Timed out waiting for $label at $url. Check logs in $LOG_DIR."
}

select_python() {
  if command -v python >/dev/null 2>&1; then
    printf '%s\n' "python"
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    printf '%s\n' "python3"
    return 0
  fi

  return 1
}

check_python_requirements() {
  local files=()
  local file

  while IFS= read -r -d '' file; do
    files+=("$file")
  done < <(
    find "$ROOT_DIR" -maxdepth 4 -type f \
      \( -iname 'requirements*.txt' -o -name 'pyproject.toml' -o -name 'Pipfile' \) \
      -not -path '*/node_modules/*' \
      -not -path '*/.git/*' \
      -not -path '*/.venv/*' \
      -print0
  )

  if [[ "${#files[@]}" -eq 0 ]]; then
    log "No Python requirements, pyproject.toml, or Pipfile found. Skipping venv setup."
    return 0
  fi

  local python_bin
  python_bin="$(select_python)" || fail "Python dependency files were found, but Python is not available."

  log "Python dependency files detected. Ensuring .venv exists."
  if [[ ! -d "$ROOT_DIR/.venv" ]]; then
    "$python_bin" -m venv "$ROOT_DIR/.venv"
  fi

  local venv_python="$ROOT_DIR/.venv/Scripts/python.exe"
  if [[ ! -x "$venv_python" ]]; then
    venv_python="$ROOT_DIR/.venv/bin/python"
  fi
  [[ -x "$venv_python" ]] || fail "Could not find Python inside .venv."

  "$venv_python" -m pip install --upgrade pip

  local installed_any=0
  for file in "${files[@]}"; do
    case "$(basename "$file")" in
      requirements*.txt)
        log "Installing Python requirements from ${file#$ROOT_DIR/}."
        "$venv_python" -m pip install -r "$file"
        installed_any=1
        ;;
    esac
  done

  if [[ "$installed_any" -eq 0 ]]; then
    log "Python project metadata found, but no requirements*.txt file. .venv is ready; no Python packages installed."
  fi
}

cleanup() {
  local exit_code=$?

  if [[ "$CLEANED_UP" -eq 1 ]]; then
    exit "$exit_code"
  fi
  CLEANED_UP=1

  trap - INT TERM EXIT
  log "Stopping FailSafe servers and clearing ports $API_PORT, $WEB_PORT..."
  kill_process_tree "$WEB_PID"
  kill_process_tree "$API_PID"
  kill_port "$WEB_PORT"
  kill_port "$API_PORT"

  if [[ "$exit_code" -eq 0 || "$exit_code" -eq 130 || "$exit_code" -eq 143 ]]; then
    log "Shutdown complete."
  else
    log "Shutdown complete after exit code $exit_code."
  fi

  exit "$exit_code"
}

trap cleanup INT TERM EXIT

require_number "ORCHESTRATOR_API_PORT" "$API_PORT"
require_number "STUDIO_WEB_PORT" "$WEB_PORT"
require_command node
require_command pnpm

mkdir -p "$LOG_DIR"

log "FailSafe root: $ROOT_DIR"
log "API port: $API_PORT"
log "Web port: $WEB_PORT"
log "API base baked into web build: $NEXT_PUBLIC_API_BASE_URL"
log "Logs: $LOG_DIR"

check_python_requirements

log "Installing/checking pnpm dependencies with the lockfile."
run_pnpm install --frozen-lockfile

if [[ "$RUN_CHECKS" != "0" ]]; then
  log "Running full project checks. Set RUN_CHECKS=0 to skip this step."
  run_pnpm check
else
  log "Skipping pnpm check because RUN_CHECKS=0."
fi

log "Building all workspace projects."
run_pnpm build

log "Clearing stale listeners before startup."
kill_port "$WEB_PORT"
kill_port "$API_PORT"

log "Starting API server."
run_pnpm --filter @failsafe/orchestrator-api start \
  >"$LOG_DIR/api.out.log" 2>"$LOG_DIR/api.err.log" &
API_PID=$!

wait_for_url "http://localhost:$API_PORT/health" "FailSafe API"

log "Starting Studio web server."
run_pnpm --filter @failsafe/studio-web exec next start -p "$WEB_PORT" -H "$HOST" \
  >"$LOG_DIR/web.out.log" 2>"$LOG_DIR/web.err.log" &
WEB_PID=$!

wait_for_url "http://localhost:$WEB_PORT" "FailSafe Studio"

log "FailSafe Studio is running: http://$DISPLAY_HOST:$WEB_PORT"
log "FailSafe API is running: http://$DISPLAY_HOST:$API_PORT"
log "Press Ctrl+C to stop all started servers and clear stale listeners."

while true; do
  if ! kill -0 "$API_PID" >/dev/null 2>&1; then
    wait "$API_PID" || true
    fail "API server exited unexpectedly. Check $LOG_DIR/api.err.log."
  fi

  if ! kill -0 "$WEB_PID" >/dev/null 2>&1; then
    wait "$WEB_PID" || true
    fail "Studio web server exited unexpectedly. Check $LOG_DIR/web.err.log."
  fi

  sleep 1
done
