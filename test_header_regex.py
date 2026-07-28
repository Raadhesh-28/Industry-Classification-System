import re

text = """
I have 5 years of experience in Java.
CERTIFICATIONS
AWS Certified (2015)
WORK EXPERIENCE
Software Engineer
2020 - 2023
EDUCATION
B.S. 2016 - 2020
"""

def isolate_experience(text: str) -> str:
    text_lower = text.lower()
    
    # 1. Isolate the Experience section to avoid parsing non-work dates
    # We must match headers like "\nEXPERIENCE\n" to avoid matching the word "experience" in sentences
    pattern_start = r'\n\s*(?:work experience|experience|employment|work history|career history|professional background)\s*\n'
    start_match = re.search(pattern_start, text_lower)
    
    if start_match:
        exp_idx = start_match.end()
        # Find the end of the section (the next header)
        # Any short line with common headers
        pattern_end = r'\n\s*(?:education|skills|certifications|projects|awards|publications|interests|volunteer|languages)\s*\n'
        end_match = re.search(pattern_end, text_lower[exp_idx:])
        
        if end_match:
            end_idx = exp_idx + end_match.start()
            work_text = text_lower[exp_idx:end_idx]
        else:
            work_text = text_lower[exp_idx:]
    else:
        work_text = text_lower
        
    return work_text.strip()

print(isolate_experience(text))
