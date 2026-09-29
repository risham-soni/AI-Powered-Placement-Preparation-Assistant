from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    IsNullCondition,
    FilterSelector,
)
from sentence_transformers import SentenceTransformer
import hashlib


COLLECTION_NAME = "placement_documents"

client = QdrantClient(path="./qdrant_data")

model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)


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

    return int(hash_value[:16], 16)


def add_documents(documents):
    if not documents:
        return

    vectors = model.encode(
        [doc["text"] for doc in documents],
        normalize_embeddings=True
    ).tolist()

    points = []

    for doc, vector in zip(
        documents,
        vectors
    ):
        point_id = create_point_id(doc)

        points.append(
            PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "text": doc["text"],
                    "page_number": doc["page_number"],
                    "chunk_index": doc["chunk_index"],
                    "document_name": doc[
                        "document_name"
                    ],
                    "company": doc["company"],
                    "user_id": doc.get(
                        "user_id"
                    ),
                },
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


def search(
    query,
    limit=5,
    company=None,
    user_id=None,
):
    query_vector = model.encode(
        query,
        normalize_embeddings=True
    ).tolist()

    # Build company filter
    company_condition = None

    if company:
        company_condition = FieldCondition(
            key="company",
            match=MatchValue(
                value=company
            ),
        )

    # -------------------------------------------------
    # CASE 1: No logged-in user
    # -------------------------------------------------
    # Search only global/built-in documents.
    if user_id is None:

        query_filter = None

        if company_condition:
            query_filter = Filter(
                must=[company_condition]
            )

        results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            query_filter=query_filter,
            limit=limit,
        )

        return results.points

    # -------------------------------------------------
    # CASE 2: Logged-in user
    # -------------------------------------------------
    # We perform two searches:
    #
    # 1. Global documents
    # 2. Documents uploaded by this user
    #
    # This prevents documents belonging to other users
    # from appearing in the results.

    global_conditions = []

    if company_condition:
        global_conditions.append(
            company_condition
        )

    # Global documents have user_id = None.
    #
    # Qdrant's payload filter for null/missing fields
    # can be avoided here by using a separate search
    # without a user filter and later checking payloads.
    global_results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=(
            Filter(must=global_conditions)
            if global_conditions
            else None
        ),
        limit=limit * 2,
    )

    # Keep only global documents.
    global_points = [
        point
        for point in global_results.points
        if point.payload.get("user_id") is None
    ]

    # Search the current user's private documents.
    user_conditions = [
        FieldCondition(
            key="user_id",
            match=MatchValue(
                value=user_id
            ),
        )
    ]

    if company_condition:
        user_conditions.append(
            company_condition
        )

    user_results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=Filter(
            must=user_conditions
        ),
        limit=limit * 2,
    )

    # Combine both result sets.
    combined = (
        global_points +
        user_results.points
    )

    # Sort by similarity score.
    combined.sort(
        key=lambda point: point.score,
        reverse=True
    )

    # Return only the requested number.
    return combined[:limit]
    query_vector = model.encode(
        query,
        normalize_embeddings=True
    ).tolist()

    conditions = []

    # Company filter
    if company:
        conditions.append(
            FieldCondition(
                key="company",
                match=MatchValue(
                    value=company
                ),
            )
        )

    # User access filter
    #
    # A user can access:
    # 1. Global/built-in documents
    # 2. Their own uploaded documents
    #
    # A user cannot access another user's documents.
    if user_id is not None:
        access_filter = Filter(
            should=[
                IsNullCondition(
                    is_null=FieldCondition(
                        key="user_id",
                        is_null=True
                    )
                ),
                FieldCondition(
                    key="user_id",
                    match=MatchValue(
                        value=user_id
                    ),
                ),
            ]
        )

        conditions.append(access_filter)

    query_filter = None

    if conditions:
        query_filter = Filter(
            must=conditions
        )

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=limit,
    )

    return results.points


def close_client():
    try:
        client.close()
    except Exception:
        pass