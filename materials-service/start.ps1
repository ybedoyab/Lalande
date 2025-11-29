# Script PowerShell para iniciar el microservicio de Materials Project

Write-Host "🚀 Starting Materials Project Microservice..." -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  Warning: .env file not found" -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
        Copy-Item .env.example .env
    }
    Write-Host "Please edit .env and add your MP_API_KEY" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if venv exists and activate it
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "✅ Activating virtual environment..." -ForegroundColor Green
    & "venv\Scripts\Activate.ps1"
} else {
    Write-Host "⚠️  Virtual environment not found. Creating one..." -ForegroundColor Yellow
    python -m venv venv
    & "venv\Scripts\Activate.ps1"
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    pip install -r requirements.txt
}

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if dependencies are installed
Write-Host "📦 Checking and installing dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt --quiet

# Verify critical imports
Write-Host "✅ Verifying installation..." -ForegroundColor Green
try {
    python -c "import fastapi; import mp_api; import pydantic_settings; print('All dependencies OK')" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Some dependencies may be missing. Reinstalling..." -ForegroundColor Yellow
        pip install -r requirements.txt --upgrade
    }
} catch {
    Write-Host "⚠️  Error verifying dependencies. Reinstalling..." -ForegroundColor Yellow
    pip install -r requirements.txt --upgrade
}

# Start the service using venv Python directly
Write-Host "✅ Starting service on port 8001..." -ForegroundColor Green
Write-Host ""
& "venv\Scripts\python.exe" app.py

