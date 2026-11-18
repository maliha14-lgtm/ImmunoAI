#!/usr/bin/env bash
# ==============================================================================
#  🛡️  ImmunoAI — Unified System Launcher (Linux / macOS)
# ==============================================================================
#  Runs all 3 services with automatic environment & dependency management:
#   1. Python PyTorch AI Inference Service (Port 5001)
#   2. Node.js Express API & WebSocket Alert Hub (Port 8000)
#   3. React Vite Surveillance Dashboard (Port 5173)
# ==============================================================================

set -e

# ANSI Color codes
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${BOLD}${CYAN}"
echo "======================================================================"
echo "   🛡️   ImmunoAI — Surveillance Intruder Defense System"
echo "======================================================================"
echo -e "${RESET}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ------------------------------------------------------------------------------
# 1. Node.js & npm Environment Check
# ------------------------------------------------------------------------------
echo -e "${BOLD}[1/4] Checking Node.js environment...${RESET}"
if ! command -v node &>/dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed. Please install Node.js (v18+) to run ImmunoAI.${RESET}"
    exit 1
fi
if ! command -v npm &>/dev/null; then
    echo -e "${RED}❌ Error: npm is not installed.${RESET}"
    exit 1
fi
echo -e "  ${GREEN}✓${RESET} Node.js $(node -v) & npm $(npm -v) detected"

# Check & install server npm dependencies
if [ ! -d "server/node_modules" ]; then
    echo -e "  ${YELLOW}⚡ Installing backend Node.js dependencies in server/...${RESET}"
    (cd server && npm install)
fi

# Check & install client npm dependencies
if [ ! -d "client/node_modules" ]; then
    echo -e "  ${YELLOW}⚡ Installing frontend dependencies in client/...${RESET}"
    (cd client && npm install)
fi

# ------------------------------------------------------------------------------
# 2. Python Deep Learning Environment Setup
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[2/4] Detecting Python Deep Learning environment...${RESET}"

# Attempt to source Conda if available
CONDA_PATHS=(
    "$HOME/anaconda3"
    "$HOME/miniconda3"
    "$HOME/miniforge3"
    "/opt/anaconda3"
    "/opt/miniconda3"
)
for cpath in "${CONDA_PATHS[@]}"; do
    if [ -f "$cpath/etc/profile.d/conda.sh" ]; then
        # shellcheck disable=SC1090
        source "$cpath/etc/profile.d/conda.sh" 2>/dev/null || true
        break
    fi
done

# Check if 'utility' conda environment exists
if command -v conda &>/dev/null; then
    if conda env list 2>/dev/null | grep -q "utility"; then
        echo -e "  ${GREEN}✓${RESET} Found Conda environment ${CYAN}'utility'${RESET}. Activating..."
        conda activate utility 2>/dev/null || true
    fi
fi

# Locate suitable python executable with PyTorch
PY_BIN=""
CANDIDATE_PYTHONS=(
    "$HOME/anaconda3/envs/utility/bin/python"
    "$HOME/miniconda3/envs/utility/bin/python"
    "$ROOT_DIR/.venv/bin/python"
    "python3"
    "python"
)

for pbin in "${CANDIDATE_PYTHONS[@]}"; do
    if command -v "$pbin" &>/dev/null || [ -f "$pbin" ]; then
        if "$pbin" -c "import torch" &>/dev/null; then
            PY_BIN="$pbin"
            break
        fi
    fi
done

# If PyTorch is not yet installed, setup a local .venv automatically
if [ -z "$PY_BIN" ]; then
    echo -e "  ${YELLOW}⚠️  PyTorch was not detected in active environment.${RESET}"
    echo -e "  ${YELLOW}⚡ Creating automatic local virtual environment (.venv)...${RESET}"
    if [ ! -d "$ROOT_DIR/.venv" ]; then
        python3 -m venv "$ROOT_DIR/.venv"
    fi
    PY_BIN="$ROOT_DIR/.venv/bin/python"
    echo -e "  ${YELLOW}📦 Installing PyTorch and dependencies from requirements.txt...${RESET}"
    "$PY_BIN" -m pip install --upgrade pip
    "$PY_BIN" -m pip install -r requirements.txt
fi

echo -e "  ${GREEN}✓${RESET} Using Python: ${CYAN}$PY_BIN${RESET}"
"$PY_BIN" -c "import torch; print(f'  ✓ PyTorch {torch.__version__} initialized on device: {\"CUDA (GPU)\" if torch.cuda.is_available() else \"CPU\"}')"

# ------------------------------------------------------------------------------
# 3. Clean up any existing instances on ports 5001, 8000, 5173
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[3/4] Preparing ports (5001, 8000, 5173)...${RESET}"
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
echo -e "  ${GREEN}✓${RESET} Ports are cleared and ready."

# ------------------------------------------------------------------------------
# 4. Launch Services in Parallel & Trap Cleanup on Exit
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[4/4] Launching ImmunoAI Services...${RESET}"

PIDS=()

cleanup() {
    echo -e "\n\n${YELLOW}🛑 Shutting down ImmunoAI services...${RESET}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    echo -e "${GREEN}✓ All services stopped safely.${RESET}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Service A: Python AI Mini Server (Port 5001)
echo -e "  🚀 Starting ${CYAN}Python AI Inference Server${RESET} (Port 5001)..."
(cd server/ai_service/mini_server && "$PY_BIN" server.py) &
PIDS+=($!)

# Service B: Node.js Express Hub & WebSocket Server (Port 8000)
echo -e "  🚀 Starting ${CYAN}Node.js Backend & WebSocket Hub${RESET} (Port 8000)..."
(cd server && node server.js) &
PIDS+=($!)

# Wait 2 seconds for backend services to bind
sleep 2

# Service C: React Vite Client (Port 5173)
echo -e "  🚀 Starting ${CYAN}React Vite Frontend Dashboard${RESET} (Port 5173)..."
echo -e "\n${BOLD}${GREEN}======================================================================${RESET}"
echo -e "${BOLD}${GREEN}  ✨ ImmunoAI is LIVE! Access the dashboard in your browser:           ${RESET}"
echo -e "${BOLD}${GREEN}  👉 http://localhost:5173                                            ${RESET}"
echo -e "${BOLD}${GREEN}======================================================================${RESET}\n"
echo -e "${YELLOW}Press Ctrl+C at any time to gracefully stop all services.${RESET}\n"

(cd client && npm run dev) &
PIDS+=($!)

# Keep script running and wait for child processes
wait
