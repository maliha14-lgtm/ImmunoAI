@echo off
setlocal enabledelayedexpansion
title ImmunoAI Surveillance System Launcher

echo ======================================================================
echo    ImmunoAI -- Surveillance Intruder Defense System Launcher
echo ======================================================================
echo.

cd /d "%~dp0"

:: -----------------------------------------------------------------------
:: 1. Check Node.js and npm
:: -----------------------------------------------------------------------
echo [1/4] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js (v18+) from https://nodejs.org
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)
echo   [OK] Node.js and npm detected.

:: Install dependencies if missing
if not exist "server\node_modules\" (
    echo   [INFO] Installing backend Node.js packages in server\...
    cd server
    call npm install
    cd ..
)

if not exist "client\node_modules\" (
    echo   [INFO] Installing frontend packages in client\...
    cd client
    call npm install
    cd ..
)

:: -----------------------------------------------------------------------
:: 2. Check and Setup Python Environment
:: -----------------------------------------------------------------------
echo.
echo [2/4] Setting up Python Deep Learning environment...

:: Attempt to activate conda utility environment if present
call conda activate utility >nul 2>nul

set "PY_CMD=python"
python -c "import torch" >nul 2>nul
if %errorlevel% neq 0 (
    :: Check if .venv exists
    if exist ".venv\Scripts\activate.bat" (
        call .venv\Scripts\activate.bat
        set "PY_CMD=python"
    ) else (
        echo   [WARNING] PyTorch was not detected in active Python.
        echo   [INFO] Creating local virtual environment (.venv)...
        python -m venv .venv
        call .venv\Scripts\activate.bat
        set "PY_CMD=python"
        echo   [INFO] Installing PyTorch and requirements...
        python -m pip install --upgrade pip
        python -m pip install -r requirements.txt
    )
)

echo   [OK] Python PyTorch environment confirmed.
%PY_CMD% -c "import torch; print('  [OK] PyTorch version:', torch.__version__, '| CUDA:', torch.cuda.is_available())"

:: -----------------------------------------------------------------------
:: 3. Clear Ports if in use
:: -----------------------------------------------------------------------
echo.
echo [3/4] Preparing ports (5001, 8000, 5173)...
for %%p in (5001 8000 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p ^| findstr LISTENING 2^>nul') do (
        taskkill /F /PID %%a >nul 2^>nul
    )
)
echo   [OK] Ports prepared.

:: -----------------------------------------------------------------------
:: 4. Launch All 3 Services
:: -----------------------------------------------------------------------
echo.
echo [4/4] Launching ImmunoAI Services in separate consoles...

:: Service 1: Python AI Mini Server (Port 5001)
start "ImmunoAI - Python AI Service (Port 5001)" cmd /k "cd /d %~dp0server\ai_service\mini_server && echo Starting Python AI Service... && %PY_CMD% server.py"

:: Service 2: Node.js Hub & WebSockets (Port 8000)
start "ImmunoAI - Node.js API Hub (Port 8000)" cmd /k "cd /d %~dp0server && echo Starting Node.js Server... && node server.js"

:: Wait 2 seconds for servers to initialize
timeout /t 2 /nobreak >nul

:: Service 3: React Vite Frontend (Port 5173)
start "ImmunoAI - React Dashboard (Port 5173)" cmd /k "cd /d %~dp0client && echo Starting React Vite Dashboard... && npm run dev"

:: Open default browser
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ======================================================================
echo    ImmunoAI is LIVE!
echo    Dashboard URL: http://localhost:5173
echo.
echo    Three service windows have been launched:
echo      1. Python AI Service        (Port 5001)
echo      2. Node.js WebSocket Hub     (Port 8000)
echo      3. React Dashboard           (Port 5173)
echo.
echo    To stop all services, run stop.bat or close the windows.
echo ======================================================================
echo.
pause
