import pdfplumber
import sys

filepath = "/Users/raadey/SEPM/Industry-Classification-System/Software Engineer Google Docs Resume Template.pdf"

print("--- PDFPLUMBER DEFAULT ---")
with pdfplumber.open(filepath) as pdf:
    for page in pdf.pages:
        print(page.extract_text())

print("\n--- PDFPLUMBER WITH LAYOUT ---")
with pdfplumber.open(filepath) as pdf:
    for page in pdf.pages:
        print(page.extract_text(layout=True))
