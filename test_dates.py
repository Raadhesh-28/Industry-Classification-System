import re
from datetime import datetime

text = """
Work Experience
Software Engineer
Google Docs
Jan 2018 - Present
- Did some things
Junior Developer
Facebook
2015 - 2018
- Did other things
Intern
03/2014 to 05/2015
"""

def test_extract(text):
    # Match years like 2010 - 2015, or 2018 - Present
    # We will just look for sequences of years
    pattern = r'\b(19\d{2}|20\d{2})\b\s*(?:-|to|–|until)\s*\b(19\d{2}|20\d{2}|present|current)\b'
    
    matches = re.findall(pattern, text, re.IGNORECASE)
    total_years = 0
    current_year = datetime.now().year
    
    for start, end in matches:
        start_yr = int(start)
        if end.lower() in ['present', 'current']:
            end_yr = current_year
        else:
            end_yr = int(end)
        
        diff = end_yr - start_yr
        if diff > 0 and diff < 40: # Sanity check
            total_years += diff
            
    print(f"Total calculated years: {total_years}")
    return total_years

test_extract(text)
