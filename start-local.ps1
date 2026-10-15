# =====================================================================
# AI-Powered Placement Preparation Assistant - PowerShell Local Launcher
# =====================================================================

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host " AI-Powered Placement Preparation Assistant - Local Development" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
}

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://python.org/"
    exit 1
}

# Auto-copy .env if missing
if (-not (Test-Path "backend\.env")) {
    Write-Host "[SETUP] Creating backend\.env from template..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
}

if (-not (Test-Path "rag-services\.env")) {
    Write-Host "[SETUP] Creating rag-services\.env from template..." -ForegroundColor Yellow
    Copy-Item "rag-services\.env.example" "rag-services\.env"
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "[SETUP] Creating frontend\.env from template..." -ForegroundColor Yellow
    Copy-Item "frontend\.env.example" "frontend\.env"
}

Write-Host "`n[STARTING] Launching Backend, FastAPI RAG Service, and Frontend..." -ForegroundColor Cyan
Write-Host "  -> Express Backend:   http://localhost:5000" -ForegroundColor White
Write-Host "  -> FastAPI RAG API:   http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  -> React Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "`nPress CTRL+C to terminate all servers.`n" -ForegroundColor DarkGray

npm run dev
