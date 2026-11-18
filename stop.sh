#!/usr/bin/env bash
# ==============================================================================
#  🛑 ImmunoAI — Stop Script (Linux / macOS)
# ==============================================================================

echo "Stopping all ImmunoAI services on ports 5001, 8000, 5173..."

for port in 5001 8000 5173; do
    if command -v fuser &>/dev/null; then
        fuser -k "${port}/tcp" 2>/dev/null || true
    elif command -v lsof &>/dev/null; then
        PID=$(lsof -ti tcp:"$port" 2>/dev/null || true)
        if [ -n "$PID" ]; then
            kill -9 "$PID" 2>/dev/null || true
        fi
    fi
done

echo "✓ All ImmunoAI services stopped."
