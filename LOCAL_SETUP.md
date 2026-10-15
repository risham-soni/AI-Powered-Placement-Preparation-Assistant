# 💻 Localhost Development Guide

Run the complete **AI-Powered Placement Preparation Assistant** locally on your machine with hot reload for the React frontend, Express backend, and Python FastAPI RAG microservice.

---

## 🚀 Quick Start (All Services in 1 Command)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **Python**: v3.10 to v3.12 recommended ([Download Python](https://www.python.org/))
- **PostgreSQL**: Local database or free [Supabase](https://supabase.com/) cloud database
- **Qdrant**: Local Docker instance or free [Qdrant Cloud](https://cloud.qdrant.io/) cluster

### 2. Install All Dependencies
From the repository root:
```bash
npm run install:all
```
*(This installs packages for `backend`, `frontend`, and `rag-services`.)*

### 3. Setup Environment Files
Copy the `.env.example` templates to `.env`:
```bash
# Windows (PowerShell)
Copy-Item backend\.env.example backend\.env
Copy-Item rag-services\.env.example rag-services\.env
Copy-Item frontend\.env.example frontend\.env

# Linux / macOS
cp backend/.env.example backend/.env
cp rag-services/.env.example rag-services/.env
cp frontend/.env.example frontend/.env
```

### 4. Run Everything!

#### Option A: Single Command
```bash
npm run dev
```

#### Option B: 1-Click Launchers
- **Windows**: Double-click [`start-local.bat`](start-local.bat) or run `powershell ./start-local.ps1`
- **macOS / Linux**: Run `bash ./start-local.sh`

---

## 🌐 Service Ports & URLs

| Service | Local URL | Description |
| :--- | :--- | :--- |
| **Frontend** | [http://localhost:5173](http://localhost:5173) | Vite + React Web Application |
| **Backend** | [http://localhost:5000](http://localhost:5000) | Express API & Auth Service |
| **RAG Service** | [http://127.0.0.1:8000](http://127.0.0.1:8000) | FastAPI + Qdrant + Gemini Microservice |
| **API Docs** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Interactive Swagger UI for RAG endpoints |

---

## 🗄️ Database Setup (PostgreSQL)

If using a local PostgreSQL instance (e.g. pgAdmin, Docker, or local service):

1. Create a database:
   ```sql
   CREATE DATABASE placement_db;
   ```
2. Initialize tables with the provided schema file:
   ```bash
   psql -U postgres -d placement_db -f database/schema.sql
   ```
3. Set your connection string in [`backend/.env`](backend/.env):
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/placement_db
   ```
   *(Note: The backend automatically disables SSL when connecting to `localhost` or `127.0.0.1`.)*

---

## 🔍 Qdrant Vector Database Setup

You can run Qdrant in either of two ways:

### Option A: Free Qdrant Cloud (Recommended & Zero Setup)
1. Sign up at [cloud.qdrant.io](https://cloud.qdrant.io/) (100% free 1GB cluster).
2. Set cluster URL and API key in [`rag-services/.env`](rag-services/.env):
   ```env
   QDRANT_URL=https://your-cluster-id.cloud.qdrant.io
   QDRANT_API_KEY=your_qdrant_api_key
   ```

### Option B: Local Docker
```bash
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage:z \
    qdrant/qdrant
```
In [`rag-services/.env`](rag-services/.env):
```env
QDRANT_URL=http://localhost:6333
# QDRANT_API_KEY can be left blank for local Qdrant
```

---

## 🛠️ Running Services Individually (Optional)

If you prefer to run each service in its own terminal tab:

### Terminal 1: Python RAG Service (Port 8000)
```bash
cd rag-services
# Activate virtual environment if using one:
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate
python app/main.py
# Or: uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Express Backend (Port 5000)
```bash
cd backend
npm run dev
```

### Terminal 3: React Frontend (Port 5173)
```bash
cd frontend
npm run dev
```

---

## 🧪 Verification & Health Checks

Once running, verify everything is connected:
- **FastAPI Health**: Visit [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) -> Should return `{"status": "healthy"}`
- **Express Health**: Visit [http://localhost:5000/api/health](http://localhost:5000/api/health) -> Should return `{"status": "OK"}`
- **Database Test**: Visit [http://localhost:5000/api/db-test](http://localhost:5000/api/db-test) -> Should return `{"status": "OK"}`
