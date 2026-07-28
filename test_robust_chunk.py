import re

def isolate_experience(text: str) -> str:
    text_lower = text.lower()
    
    # 1. Find the start of the Experience section
    exp_headers = ['experience', 'employment', 'work history', 'career history', 'professional background']
    exp_idx = -1
    for header in exp_headers:
        idx = text_lower.find(header)
        if idx != -1:
            if exp_idx == -1 or idx < exp_idx: # Find the first occurrence? Or max?
                # Actually, max was used before because text.find returns -1 if not found.
                # Let's find the FIRST valid header
                pass
    
    # Better logic to find exp_idx:
    valid_exp_indices = [text_lower.find(h) for h in exp_headers if text_lower.find(h) != -1]
    if not valid_exp_indices:
        return text # Fallback
    
    # Take the earliest valid experience header
    exp_idx = min(valid_exp_indices)
    
    # 2. Find the end of the Experience section
    # The end is the start of the next section
    end_headers = ['education', 'skills', 'certifications', 'projects', 'awards', 'publications', 'interests', 'volunteer', 'languages']
    
    valid_end_indices = [text_lower.find(h, exp_idx + 5) for h in end_headers if text_lower.find(h, exp_idx + 5) != -1]
    
    if valid_end_indices:
        end_idx = min(valid_end_indices)
        work_text = text_lower[exp_idx:end_idx]
    else:
        work_text = text_lower[exp_idx:]
        
    return work_text

text1 = """
EXPERIENCE
Software Engineer
2020-2023
CERTIFICATIONS
AWS Certified
2015
EDUCATION
B.S.
2016-2020
"""

print(isolate_experience(text1))

