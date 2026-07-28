import re
from datetime import datetime

text = """
Intern
03/2014 to 05/2015
"""
pattern = r'\b(19\d{2}|20\d{2})\b\s*(?:-|to|–|—|until)\s*\b(19\d{2}|20\d{2}|present|current)\b'
print("Matches:", re.findall(pattern, text, re.IGNORECASE))

# The issue is that "03/2014 to 05/2015" has "05/" in between!
# "2014\b" is followed by " to 05/" which is NOT matched by \s*(?:-|to)\s*
pattern2 = r'\b(19\d{2}|20\d{2})\b[^\d]{1,15}\b(19\d{2}|20\d{2}|present|current)\b'
print("Matches 2:", re.findall(pattern2, text, re.IGNORECASE))
