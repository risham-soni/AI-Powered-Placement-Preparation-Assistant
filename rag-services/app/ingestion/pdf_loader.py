import pymupdf
import pytesseract
from PIL import Image
from pathlib import Path
import io


pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def load_pdf(file_path: str):
    document = pymupdf.open(file_path)

    print(f"\nOpening: {Path(file_path).name}")
    print(f"Total PDF pages: {len(document)}")

    pages = []

    for page_number, page in enumerate(document):

        print(f"Processing page {page_number + 1}...")

        # First try normal PDF text extraction
        text = page.get_text()

        # If the PDF is image-based, use OCR
        if not text.strip():

            pixmap = page.get_pixmap(
                matrix=pymupdf.Matrix(2, 2)
            )

            image = Image.open(
                io.BytesIO(
                    pixmap.tobytes("png")
                )
            )

            text = pytesseract.image_to_string(image)

        print(f"Extracted characters: {len(text)}")

        if text.strip():
            pages.append({
                "page_number": page_number + 1,
                "text": text
            })

    document.close()

    return pages


if __name__ == "__main__":

    pdf_folder = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "pdfs"
    )

    pdf_files = list(pdf_folder.glob("*.pdf"))

    print(f"PDF folder: {pdf_folder}")
    print(f"Found {len(pdf_files)} PDF file(s).")

    for pdf_file in pdf_files:

        pages = load_pdf(str(pdf_file))

        print(
            f"Finished {pdf_file.name}: "
            f"{len(pages)} page(s) with text."
        )