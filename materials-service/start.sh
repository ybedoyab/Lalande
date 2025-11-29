#!/bin/bash
# Script para iniciar el microservicio de Materials Project

echo "🚀 Starting Materials Project Microservice..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Creating .env.example..."
    cp .env.example .env
    echo "Please edit .env and add your MP_API_KEY"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

# Check if dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip3 install -r requirements.txt
fi

# Start the service
echo "✅ Starting service on port 8001..."
python3 app.py

