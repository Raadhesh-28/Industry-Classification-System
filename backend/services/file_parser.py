import io
import docx
import pdfplumber
from fastapi import UploadFile
import pytesseract
from pdf2image import convert_from_bytes

def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
                
    # OCR Fallback: If pdfplumber extracts suspiciously little text (e.g. < 150 chars)
    # it indicates a flattened PDF or image-based template.
    if len(text.strip()) < 150:
        try:
            print("INFO: Flat PDF detected, falling back to Tesseract OCR...")
            images = convert_from_bytes(file_bytes)
            ocr_text = ""
            for image in images:
                ocr_text += pytesseract.image_to_string(image) + "\n"
            if len(ocr_text.strip()) > len(text.strip()):
                return ocr_text
        except Exception as e:
            print(f"OCR Fallback failed: {e}")
            
    return text

def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    text = "\n".join([para.text for para in doc.paragraphs])
    return text

async def parse_upload_file(file: UploadFile) -> str:
    content = await file.read()
    filename = file.filename.lower()
    if filename.endswith(".pdf"):
        return extract_text_from_pdf(content)
    elif filename.endswith(".docx"):
        return extract_text_from_docx(content)
    else:
        # Fallback to pure text decoding
        try:
            return content.decode('utf-8')
        except UnicodeDecodeError:
            return ""
