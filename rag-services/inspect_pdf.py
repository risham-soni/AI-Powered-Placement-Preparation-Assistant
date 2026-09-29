import pymupdf

PDF_PATH = "data/pdfs/TCS_Interview_Question_Sheet.pdf"

doc = pymupdf.open(PDF_PATH)

print("Total pages:", len(doc))

for i, page in enumerate(doc):
    print("\n============================")
    print("PAGE:", i + 1)
    print("============================")

    print("Text:", repr(page.get_text("text")[:200]))
    print("Words:", len(page.get_text("words")))
    print("Images:", len(page.get_images(full=True)))

    annotations = list(page.annots() or [])
    print("Annotations:", len(annotations))

    widgets = list(page.widgets() or [])
    print("Widgets/forms:", len(widgets))

doc.close()