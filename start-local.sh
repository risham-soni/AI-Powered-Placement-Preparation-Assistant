#!/usr/bin/env bash
# =====================================================================
# AI-Powered Placement Preparation Assistant - Bash Local Launcher
# =====================================================================

set -e

echo "====================================================================="
echo " AI-Powered Placement Preparation Assistant - Local Development"
echo "====================================================================="

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed or not in PATH!"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Python
if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
    echo "[ERROR] Python is not installed or not in PATH!"
    echo "Please install Python 3.10+ from https://python.org/"
    exit 1
fi

# Auto-copy .env if missing
if [ ! -f "backend/.env" ]; then
    echo "[SETUP] Creating backend/.env from template..."
    cp backend/.env.example backend/.env
fi

if [ ! -f "rag-services/.env" ]; then
    echo "[SETUP] Creating rag-services/.env from template..."
    cp rag-services/.env.example rag-services/.env
fi

if [ ! -f "frontend/.env" ]; then
    echo "[SETUP] Creating frontend/.env from template..."
    cp frontend/.env.example frontend/.env
fi

echo ""
echo "[STARTING] Launching Backend, FastAPI RAG Service, and Frontend..."
echo "  -> Express Backend:   http://localhost:5000"
echo "  -> FastAPI RAG API:   http://127.0.0.1:8000"
echo "  -> React Frontend:    http://localhost:5173"
echo ""
echo "Press CTRL+C to terminate all servers."
echo "====================================================================="

npm run dev
