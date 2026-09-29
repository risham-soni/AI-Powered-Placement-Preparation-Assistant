from pypdf import PdfReader

PDF_PATH = "data/pdfs/TCS_Interview_Question_Sheet.pdf"

reader = PdfReader(PDF_PATH)

print("Total pages:", len(reader.pages))

for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""

    print("\n============================")
    print("PAGE:", i + 1)
    print("CHARACTERS:", len(text))
    print("============================")
    print(text[:1000])