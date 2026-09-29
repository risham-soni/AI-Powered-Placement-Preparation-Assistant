from pathlib import Path

from app.ingestion.pdf_loader import load_pdf
from app.ingestion.chunker import create_chunks
from app.retrieval.retriever import (
    create_collection,
    add_documents,
)


def get_company_name(file_name):
    """
    Determine company name from the PDF filename.
    """

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

    pdf_files = list(pdf_folder.glob("*.pdf"))

    if not pdf_files:
        print("No PDF files found.")
        return

    print(f"Found {len(pdf_files)} PDF file(s).")

    create_collection()

    total_chunks = 0

    for pdf_file in pdf_files:

        print("\n" + "=" * 60)
        print(f"Processing: {pdf_file.name}")
        print("=" * 60)

        company = get_company_name(
            pdf_file.name
        )

        print(f"Company: {company}")

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

        add_documents(documents)

        total_chunks += len(documents)

    print("\n" + "=" * 60)
    print("INGESTION COMPLETED")
    print("=" * 60)
    print(
        f"Total chunks added: {total_chunks}"
    )


if __name__ == "__main__":
    ingest_all_pdfs()