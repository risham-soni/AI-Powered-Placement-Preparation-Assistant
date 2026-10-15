from pathlib import Path

from app.ingestion.pdf_loader import load_pdf
from app.ingestion.chunker import create_chunks
from app.retrieval.retriever import (
    add_documents,
)


def process_uploaded_pdf(
    file_path=None,
    company="Unknown",
    user_id=None,
    file_base64=None,
    file_name=None,
):
    """
    Process one user-uploaded PDF.

    Flow:
    PDF (path or base64 decoded)
      ↓
    OCR / text extraction
      ↓
    Chunking
      ↓
    Embeddings
      ↓
    Qdrant
    """
    upload_dir = Path(__file__).resolve().parents[2] / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    target_name = file_name or (Path(file_path).name if file_path else "uploaded.pdf")

    if file_base64:
        import base64
        try:
            pdf_bytes = base64.b64decode(file_base64)
            pdf_path = upload_dir / target_name
            pdf_path.write_bytes(pdf_bytes)
        except Exception as err:
            raise ValueError(f"Failed to decode base64 file data: {err}")
    elif file_path:
        pdf_path = Path(file_path)
    else:
        raise ValueError("Either file_base64 or file_path must be provided.")

    print("\n" + "=" * 60)
    print("PROCESSING UPLOADED PDF")
    print("=" * 60)

    print(f"File: {pdf_path}")
    print(f"Target Name: {target_name}")
    print(f"Company: {company}")
    print(f"User ID: {user_id}")

    if not pdf_path.exists():

        raise FileNotFoundError(
            f"PDF file not found: {pdf_path}"
        )

    # Extract text from PDF
    pages = load_pdf(
        str(pdf_path)
    )

    if not pages:

        raise ValueError(
            "No text could be extracted from the PDF."
        )

    print(
        f"Extracted text from "
        f"{len(pages)} page(s)."
    )

    # Create chunks
    documents = create_chunks(
        pages=pages,
        document_name=target_name,
        company=company,
        user_id=user_id
    )

    if not documents:

        raise ValueError(
            "No chunks were created from the PDF."
        )

    print(
        f"Created {len(documents)} chunks."
    )

    # Add chunks and embeddings to Qdrant
    add_documents(
        documents
    )

    print(
        f"Successfully added "
        f"{len(documents)} chunks to Qdrant."
    )

    print("=" * 60)

    return {
        "file_name": target_name,
        "company": company,
        "user_id": user_id,
        "pages": len(pages),
        "chunks": len(documents),
    }


def get_company_name(file_name):

    name = file_name.lower()

    companies = [
        "tcs",
        "amazon",
        "microsoft",
        "google",
        "infosys",
        "accenture",
    ]

    for company in companies:

        if company in name:
            return company.capitalize()

    return "Unknown"


def ingest_all_pdfs():

    pdf_folder = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "pdfs"
    )

    pdf_files = list(
        pdf_folder.glob("*.pdf")
    )

    if not pdf_files:

        print(
            "No PDF files found."
        )

        return

    print(
        f"Found {len(pdf_files)} PDF file(s)."
    )

    total_chunks = 0

    for pdf_file in pdf_files:

        print(
            "\n" + "=" * 60
        )

        print(
            f"Processing: {pdf_file.name}"
        )

        print(
            "=" * 60
        )

        company = get_company_name(
            pdf_file.name
        )

        print(
            f"Company: {company}"
        )

        pages = load_pdf(
            str(pdf_file)
        )

        if not pages:

            print(
                f"No text extracted from "
                f"{pdf_file.name}"
            )

            continue

        documents = create_chunks(
            pages=pages,
            document_name=pdf_file.name,
            company=company,
            user_id=None
        )

        print(
            f"Created {len(documents)} chunks."
        )

        add_documents(
            documents
        )

        total_chunks += len(
            documents
        )

    print(
        "\n" + "=" * 60
    )

    print(
        "INGESTION COMPLETED"
    )

    print(
        "=" * 60
    )

    print(
        f"Total chunks added: "
        f"{total_chunks}"
    )


if __name__ == "__main__":

    ingest_all_pdfs()