@echo off
echo Stopping all ImmunoAI services on ports 5001, 8000, 5173...

for %%p in (5001 8000 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p ^| findstr LISTENING 2^>nul') do (
        taskkill /F /PID %%a >nul 2^>nul
    )
)

echo [OK] All ImmunoAI services stopped.
pause
