from langchain_text_splitters import RecursiveCharacterTextSplitter


def create_chunks(
    pages,
    document_name,
    company,
    user_id=None
):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150
    )

    documents = []

    for page in pages:
        chunks = splitter.split_text(
            page["text"]
        )

        for index, chunk in enumerate(chunks):
            documents.append({
                "text": chunk,
                "page_number": page["page_number"],
                "chunk_index": index,
                "document_name": document_name,
                "company": company,
                "user_id": user_id,
            })

    return documents