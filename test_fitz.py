import fitz # PyMuPDF
filepath = "/Users/raadey/SEPM/Industry-Classification-System/Software Engineer Google Docs Resume Template.pdf"

doc = fitz.open(filepath)
text = ""
for page in doc:
    text += page.get_text() + "\n"

print("--- PYMUPDF OUTPUT ---")
print(text)
