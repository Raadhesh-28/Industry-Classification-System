from pypdf import PdfReader
filepath = "/Users/raadey/SEPM/Industry-Classification-System/Software Engineer Google Docs Resume Template.pdf"

reader = PdfReader(filepath)
text = ""
for page in reader.pages:
    text += page.extract_text() + "\n"

print(text)
