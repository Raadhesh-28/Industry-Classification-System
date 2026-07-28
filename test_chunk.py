import re
import datetime

text = """
RHODA
WORK EXPERIENCE
JACKSON
Graphic Designer
Mozilla
2023 - current Denver, CO
Junior Graphic Designer
2021 - 2023 Austin, TX
EDUCATION
B.F.A.
University of Chicago
2016 - 2020
"""

def test_extract(text):
    text_lower = text.lower()
    
    # Try to isolate the Experience section
    # Find "experience" and "education"
    exp_idx = text_lower.find('experience')
    edu_idx = text_lower.find('education')
    
    # If both found, and edu comes after exp, slice it!
    if exp_idx != -1 and edu_idx != -1 and edu_idx > exp_idx:
        work_text = text_lower[exp_idx:edu_idx]
    elif exp_idx != -1:
        # If experience is found but no education after it, just take everything after
        work_text = text_lower[exp_idx:]
    else:
        work_text = text_lower # fallback to whole text
        
    print("Isolated Work Text:")
    print(work_text)
    print("---")
    
    pattern = r'\b(19\d{2}|20\d{2})\b.{1,30}?\b(19\d{2}|20\d{2}|present|current)\b'
    matches = re.findall(pattern, work_text, re.IGNORECASE)
    
    years = []
    current_year = datetime.datetime.now().year
    
    if matches:
        for start, end in matches:
            try:
                years.append(int(start))
                if end.lower() in ['present', 'current']:
                    years.append(current_year)
                else:
                    years.append(int(end))
            except Exception:
                continue
                
    if years:
        total = max(years) - min(years)
        print(f"Calculated Total Years: {total}")
        return total
        
    return 0

test_extract(text)
