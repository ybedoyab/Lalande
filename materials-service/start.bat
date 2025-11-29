@echo off
REM Script para iniciar el microservicio de Materials Project en Windows

echo 🚀 Starting Materials Project Microservice...

REM Check if .env exists
if not exist .env (
    echo ⚠️  Warning: .env file not found
    if exist .env.example (
        echo Creating .env from .env.example...
        copy .env.example .env
    )
    echo Please edit .env and add your MP_API_KEY
    pause
    exit /b 1
)

REM Check if venv exists and activate it
if exist venv\Scripts\activate.bat (
    echo ✅ Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo ⚠️  Virtual environment not found. Creating one...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo 📦 Installing dependencies...
    pip install -r requirements.txt
)

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check and install dependencies
echo 📦 Installing/updating dependencies...
pip install -r requirements.txt --quiet

REM Verify critical imports
echo ✅ Verifying installation...
python -c "import fastapi; import mp_api; import pydantic_settings" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Some dependencies may be missing. Reinstalling...
    pip install -r requirements.txt --upgrade
)

REM Start the service using venv Python directly
echo ✅ Starting service on port 8001...
echo.
venv\Scripts\python.exe app.py

pause
