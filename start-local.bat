@echo off
title AI-Powered Placement Preparation Assistant - Local Dev
echo =====================================================================
echo  AI-Powered Placement Preparation Assistant - Local Development
echo =====================================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from https://python.org/
    pause
    exit /b 1
)

:: Ensure .env files exist from templates if missing
if not exist "backend\.env" (
    echo [SETUP] Creating backend\.env from template...
    copy "backend\.env.example" "backend\.env" >nul
)

if not exist "rag-services\.env" (
    echo [SETUP] Creating rag-services\.env from template...
    copy "rag-services\.env.example" "rag-services\.env" >nul
)

if not exist "frontend\.env" (
    echo [SETUP] Creating frontend\.env from template...
    copy "frontend\.env.example" "frontend\.env" >nul
)

echo [STARTING] Launching Backend, FastAPI RAG Service, and Frontend...
echo.
echo - Express Backend:   http://localhost:5000
echo - FastAPI RAG API:   http://127.0.0.1:8000
echo - React Frontend:    http://localhost:5173
echo.
echo Press CTRL+C to terminate all servers.
echo =====================================================================
echo.

npm run dev
pause
