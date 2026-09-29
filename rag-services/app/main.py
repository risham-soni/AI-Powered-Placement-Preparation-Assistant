import os

import jwt

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.rag.chain import generate_answer


app = FastAPI(
    title="AI-Powered Placement Preparation Assistant",
    description="RAG API for placement preparation",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str
    company: str | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list


class UploadRequest(BaseModel):
    file_path: str
    company: str
    user_id: int


def get_user_id_from_token(
    authorization: str | None
):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization token required"
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization format"
        )

    token = authorization.split(
        " ",
        1
    )[1]

    jwt_secret = os.getenv("JWT_SECRET")

    if not jwt_secret:
        raise HTTPException(
            status_code=500,
            detail="JWT secret is not configured"
        )

    try:

        decoded = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"]
        )

        user_id = decoded.get("userId")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        return int(user_id)

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )


@app.get("/")
def root():

    return {
        "message":
            "Placement Preparation Assistant API is running"
    }


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

    user_id = get_user_id_from_token(
        authorization
    )

    company = request.company

    if company == "All Companies":
        company = None

    result = generate_answer(
        question=request.question,
        company=company,
        user_id=user_id
    )

    return {
        "answer": result["answer"],
        "sources": result["sources"]
    }


@app.post("/documents/process")
def process_document(
    request: UploadRequest
):

    if not os.path.exists(
        request.file_path
    ):

        raise HTTPException(
            status_code=404,
            detail="Uploaded PDF file not found"
        )

    return {
        "message": "Document processing endpoint is ready",
        "file_path": request.file_path,
        "company": request.company,
        "user_id": request.user_id
    }