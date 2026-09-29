from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from sentence_transformers import SentenceTransformer
import hashlib


COLLECTION_NAME = "placement_documents"


client = QdrantClient(
    path="./qdrant_data"
)


model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)


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

    vectors = model.encode(
        [doc["text"] for doc in documents],
        normalize_embeddings=True
    ).tolist()

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

def search(
    query,
    limit=5,
    company=None,
    user_id=None,
    document_name=None,
):

    query_vector = model.encode(
        query,
        normalize_embeddings=True
    ).tolist()


    # ==================================
    # COMPANY FILTER
    # ==================================

    company_condition = None

    if company:

        company_condition = FieldCondition(
            key="company",

            match=MatchValue(
                value=company
            ),
        )


    # ==================================
    # DOCUMENT FILTER
    # ==================================

    document_condition = None

    if document_name:

        document_condition = FieldCondition(
            key="document_name",

            match=MatchValue(
                value=document_name
            ),
        )


    # ==================================
    # NO USER
    # ==================================

    if user_id is None:

        conditions = []

        if company_condition:
            conditions.append(
                company_condition
            )

        if document_condition:
            conditions.append(
                document_condition
            )

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


    # ==================================
    # GLOBAL DOCUMENTS
    # ==================================

    global_conditions = []

    if company_condition:

        global_conditions.append(
            company_condition
        )

    if document_condition:

        global_conditions.append(
            document_condition
        )


    global_results = client.query_points(

        collection_name=COLLECTION_NAME,

        query=query_vector,

        query_filter=(
            Filter(
                must=global_conditions
            )
            if global_conditions
            else None
        ),

        limit=limit * 2,
    )


    # Only built-in/global documents
    global_points = [

        point

        for point in global_results.points

        if point.payload.get(
            "user_id"
        ) is None

    ]


    # ==================================
    # USER DOCUMENTS
    # ==================================

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


    if document_condition:

        user_conditions.append(
            document_condition
        )


    user_results = client.query_points(

        collection_name=COLLECTION_NAME,

        query=query_vector,

        query_filter=Filter(
            must=user_conditions
        ),

        limit=limit * 2,
    )


    # ==================================
    # COMBINE RESULTS
    # ==================================

    combined = (
        global_points
        +
        user_results.points
    )


    combined.sort(

        key=lambda point:
            point.score,

        reverse=True

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