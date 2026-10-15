from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    MatchAny,
    PayloadSchemaType,
)
import os
import hashlib
import torch
from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parents[2] / ".env"
if _env_path.exists():
    load_dotenv(_env_path)
load_dotenv()

COLLECTION_NAME = "placement_documents"

# Optimize PyTorch and HuggingFace for 512MB RAM cloud instances (e.g. Render)
torch.set_num_threads(1)
torch.set_grad_enabled(False)
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

_qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
_qdrant_api_key = os.getenv("QDRANT_API_KEY")

if _qdrant_api_key:
    client = QdrantClient(url=_qdrant_url, api_key=_qdrant_api_key)
else:
    client = QdrantClient(url=_qdrant_url)

import threading

_model = None
_model_lock = threading.Lock()

def get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                try:
                    from huggingface_hub.utils import logging as hf_logging
                    hf_logging.set_verbosity_error()
                except Exception:
                    pass

                from sentence_transformers import SentenceTransformer
                hf_token = os.getenv("HF_TOKEN")
                if hf_token:
                    _model = SentenceTransformer("all-MiniLM-L6-v2", token=hf_token)
                else:
                    _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


# ==================================
# CREATE COLLECTION
# ==================================

def create_collection():

    collections = client.get_collections()

    existing = [
        collection.name
        for collection in collections.collections
    ]

    if COLLECTION_NAME not in existing:

        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=384,
                distance=Distance.COSINE
            )
        )

        print(
            f"Created Qdrant collection: "
            f"{COLLECTION_NAME}"
        )

    else:

        print(
            f"Qdrant collection already exists: "
            f"{COLLECTION_NAME}"
        )

    # Ensure required payload indices exist for filtering
    for field, schema in [
        ("company", PayloadSchemaType.KEYWORD),
        ("document_name", PayloadSchemaType.KEYWORD),
        ("user_id", PayloadSchemaType.INTEGER),
    ]:
        try:
            client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name=field,
                field_schema=schema,
            )
        except Exception:
            pass


# ==================================
# CREATE POINT ID
# ==================================

def create_point_id(document):

    unique_string = (
        f"{document.get('user_id', 'global')}_"
        f"{document['company']}_"
        f"{document['document_name']}_"
        f"{document['page_number']}_"
        f"{document['chunk_index']}"
    )

    hash_value = hashlib.md5(
        unique_string.encode("utf-8")
    ).hexdigest()

    return int(
        hash_value[:16],
        16
    )


# ==================================
# ADD DOCUMENTS
# ==================================

def add_documents(documents):

    if not documents:
        return

    create_collection()

    model = get_model()

    texts = [doc["text"] for doc in documents]

    # Batch encode with mini-slices and inference_mode to minimize memory footprint on Render 512MB
    vectors = []
    chunk_size = 8
    with torch.inference_mode():
        for i in range(0, len(texts), chunk_size):
            batch_texts = texts[i : i + chunk_size]
            batch_vecs = model.encode(
                batch_texts,
                batch_size=2,
                show_progress_bar=False,
                normalize_embeddings=True,
            ).tolist()
            vectors.extend(batch_vecs)

    import gc
    gc.collect()

    points = []

    for doc, vector in zip(
        documents,
        vectors
    ):

        point_id = create_point_id(
            doc
        )

        points.append(
            PointStruct(
                id=point_id,

                vector=vector,

                payload={
                    "text": doc["text"],

                    "page_number":
                        doc["page_number"],

                    "chunk_index":
                        doc["chunk_index"],

                    "document_name":
                        doc["document_name"],

                    "company":
                        doc["company"],

                    "user_id":
                        doc.get("user_id"),
                }
            )
        )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
    )

    print(
        f"Added/updated {len(points)} "
        f"chunks in Qdrant."
    )


# ==================================
# SEARCH
# ==================================

def get_company_variants(comp: str) -> list[str]:
    if not comp:
        return []
    comp = comp.strip()
    variants = [
        comp,
        comp.lower(),
        comp.upper(),
        comp.capitalize(),
        comp.title(),
    ]
    canonical = {
        "tcs": "TCS",
        "amazon": "Amazon",
        "google": "Google",
        "microsoft": "Microsoft",
        "infosys": "Infosys",
        "accenture": "Accenture",
    }
    if comp.lower() in canonical:
        variants.append(canonical[comp.lower()])
    return list(dict.fromkeys(v for v in variants if v))


def search(
    query,
    limit=5,
    company=None,
    user_id=None,
    document_name=None,
):
    if user_id is not None:
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            pass

    model = get_model()

    with torch.inference_mode():
        query_vector = model.encode(
            query,
            show_progress_bar=False,
            normalize_embeddings=True
        ).tolist()

    # ==================================
    # COMPANY FILTER (Case-Insensitive)
    # ==================================
    company_condition = None
    if company:
        variants = get_company_variants(company)
        if len(variants) == 1:
            company_condition = FieldCondition(
                key="company",
                match=MatchValue(value=variants[0]),
            )
        else:
            company_condition = FieldCondition(
                key="company",
                match=MatchAny(any=variants),
            )

    # ==================================
    # DOCUMENT FILTER
    # ==================================
    document_condition = None
    if document_name:
        doc_clean = str(document_name).strip()
        doc_base = Path(doc_clean).name
        variants = list(dict.fromkeys([doc_clean, doc_base]))
        if len(variants) == 1:
            document_condition = FieldCondition(
                key="document_name",
                match=MatchValue(value=variants[0]),
            )
        else:
            document_condition = FieldCondition(
                key="document_name",
                match=MatchAny(any=variants),
            )

    # ==================================
    # NO USER (Anonymous / Built-in Test)
    # ==================================
    if user_id is None:
        conditions = []
        if company_condition:
            conditions.append(company_condition)
        if document_condition:
            conditions.append(document_condition)

        query_filter = Filter(must=conditions) if conditions else None

        results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            query_filter=query_filter,
            limit=limit,
        )
        return results.points

    # ==================================
    # USER DOCUMENTS
    # ==================================
    user_points = []
    base_user_conditions = [
        FieldCondition(
            key="user_id",
            match=MatchValue(value=user_id),
        )
    ]
    if document_condition:
        base_user_conditions.append(document_condition)

    # First attempt: user_id (+ document_condition) + company_condition (if given)
    user_attempt_conditions = list(base_user_conditions)
    if company_condition:
        user_attempt_conditions.append(company_condition)

    user_results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=Filter(must=user_attempt_conditions),
        limit=limit * 2,
    )
    user_points = list(user_results.points)

    # If company filter caused 0 results, but document_name was specified,
    # fall back to querying just by user_id + document_condition so user's selected document is not dropped
    if not user_points and document_condition and company_condition:
        fallback_results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            query_filter=Filter(must=base_user_conditions),
            limit=limit * 2,
        )
        user_points = list(fallback_results.points)

    # ==================================
    # GLOBAL DOCUMENTS
    # ==================================
    global_points = []
    # If a specific user document was selected and found, prioritize that document and do not pollute with global docs
    if not (document_condition and user_points):
        global_conditions = []
        if company_condition:
            global_conditions.append(company_condition)
        if document_condition:
            global_conditions.append(document_condition)

        global_results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            query_filter=Filter(must=global_conditions) if global_conditions else None,
            limit=limit * 2,
        )

        global_points = [
            point
            for point in global_results.points
            if point.payload.get("user_id") is None
        ]

    # ==================================
    # COMBINE RESULTS
    # ==================================
    combined = user_points + global_points
    combined.sort(
        key=lambda point: point.score,
        reverse=True,
    )
    return combined[:limit]


# ==================================
# CLOSE CLIENT
# ==================================

def close_client():

    try:

        client.close()

    except Exception:

        pass