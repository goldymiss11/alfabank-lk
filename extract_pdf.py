import pymupdf
doc = pymupdf.open('/data/case.pdf')
for i, page in enumerate(doc):
    text = page.get_text()
    print(f'=== PAGE {i+1} ===')
    print(text)
    print()
