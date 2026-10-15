import os

import jwt

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.rag.chain import generate_answer
from app.ingestion.ingest import process_uploaded_pdf


# ==================================
# FASTAPI APPLICATION
# ==================================

app = FastAPI(
    title="AI-Powered Placement Preparation Assistant",
    description="RAG API for placement preparation",
    version="1.0.0"
)


# ==================================
# CORS
# ==================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-powered-placement-preparation-assistant-c3903we45.vercel.app"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================
# APPLICATION LIFECYCLE
# ==================================

import threading
import time
import sys

# Ensure stdout is unbuffered so all prints show up immediately in Render logs
try:
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass


def _warmup_model():
    # Delay 2 seconds so Uvicorn completes port binding and passes Render's initial port scan
    time.sleep(2)
    print("[Warmup] Initializing embedding model in background...", flush=True)
    try:
        from app.retrieval.retriever import get_model
        get_model()
        print("[Warmup] Embedding model initialized and ready for queries!", flush=True)
    except Exception as exc:
        print("[Warmup] Model warmup warning:", exc, flush=True)


@app.on_event("startup")
def startup_event():
    print("[Startup] RAG API started. Starting background model warmup...", flush=True)
    threading.Thread(target=_warmup_model, daemon=True).start()


@app.on_event("shutdown")
def shutdown_event():
    print("[Shutdown] RAG API is shutting down gracefully (Render rolling deploy or idle sleep).", flush=True)


# ==================================
# REQUEST MODELS
# ==================================

class ChatRequest(BaseModel):

    question: str

    company: str | None = None

    # Selected uploaded PDF
    document_name: str | None = None


class ChatResponse(BaseModel):

    answer: str

    sources: list


class UploadRequest(BaseModel):

    file_path: str | None = None

    file_base64: str | None = None

    file_name: str | None = None

    company: str

    user_id: int


# ==================================
# GET USER ID FROM JWT
# ==================================

def get_user_id_from_token(
    authorization: str | None
):

    # --------------------------------
    # CHECK TOKEN EXISTS
    # --------------------------------

    if not authorization:

        raise HTTPException(
            status_code=401,
            detail="Authorization token required"
        )


    # --------------------------------
    # CHECK BEARER FORMAT
    # --------------------------------

    if not authorization.startswith(
        "Bearer "
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid authorization format"
        )


    # --------------------------------
    # EXTRACT TOKEN
    # --------------------------------

    token = authorization.split(
        " ",
        1
    )[1]


    # --------------------------------
    # LOAD JWT SECRET
    # --------------------------------

    jwt_secret = os.getenv(
        "JWT_SECRET"
    )


    if not jwt_secret:

        raise HTTPException(
            status_code=500,
            detail="JWT secret is not configured"
        )


    # --------------------------------
    # VERIFY TOKEN
    # --------------------------------

    try:

        decoded = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"]
        )


        user_id = decoded.get(
            "userId"
        )


        if user_id is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )


        return int(user_id)


    # --------------------------------
    # EXPIRED TOKEN
    # --------------------------------

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )


    # --------------------------------
    # INVALID TOKEN
    # --------------------------------

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )


# ==================================
# ROOT & HEALTH CHECK ENDPOINTS
# ==================================

@app.api_route("/", methods=["GET", "HEAD"])
def root():

    return {
        "message":
            "Placement Preparation Assistant API is running"
    }


@app.api_route("/health", methods=["GET", "HEAD"])
def health():

    return {
        "status": "healthy"
    }


# ==================================
# CHAT ENDPOINT
# ==================================

@app.post(
    "/chat",
    response_model=ChatResponse
)
def chat(

    request: ChatRequest,

    authorization: str | None = Header(
        default=None
    )

):

    # --------------------------------
    # GET LOGGED-IN USER
    # --------------------------------

    user_id = get_user_id_from_token(
        authorization
    )


    # --------------------------------
    # COMPANY FILTER
    # --------------------------------

    company = request.company


    if company == "All Companies":

        company = None


    # --------------------------------
    # SELECTED DOCUMENT
    # --------------------------------

    document_name = request.document_name


    print(
        "\n=============================="
    )

    print(
        "CHAT REQUEST"
    )

    print(
        "=============================="
    )

    print(
        f"User ID: {user_id}"
    )

    print(
        f"Company: {company}"
    )

    print(
        f"Document: {document_name}"
    )

    print(
        f"Question: {request.question}"
    )


    # --------------------------------
    # GENERATE RAG ANSWER
    # --------------------------------

    result = generate_answer(

        question=request.question,

        company=company,

        user_id=user_id,

        document_name=document_name

    )


    # --------------------------------
    # RETURN RESPONSE
    # --------------------------------

    return {

        "answer":
            result["answer"],

        "sources":
            result["sources"]

    }


# ==================================
# PROCESS UPLOADED DOCUMENT
# ==================================

@app.post(
    "/documents/process"
)
def process_document(

    request: UploadRequest

):

    try:

        # --------------------------------
        # PROCESS PDF
        # --------------------------------

        result = process_uploaded_pdf(

            file_path=request.file_path,

            file_base64=request.file_base64,

            file_name=request.file_name,

            company=request.company,

            user_id=request.user_id

        )


        # --------------------------------
        # SUCCESS RESPONSE
        # --------------------------------

        return {

            "message":
                "PDF processed and added to Qdrant.",

            "document":
                result

        }


    # --------------------------------
    # FILE NOT FOUND
    # --------------------------------

    except FileNotFoundError as error:

        raise HTTPException(

            status_code=404,

            detail=str(error)

        )


    # --------------------------------
    # INVALID PDF
    # --------------------------------

    except ValueError as error:

        raise HTTPException(

            status_code=400,

            detail=str(error)

        )


    # --------------------------------
    # OTHER ERROR
    # --------------------------------

    except Exception as error:

        print(
            "Document processing error:",
            error
        )


        raise HTTPException(

            status_code=500,

            detail=f"Failed to process the uploaded PDF: {str(error)}"

        )