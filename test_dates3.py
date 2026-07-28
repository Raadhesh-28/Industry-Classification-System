import re

text = """
Software Engineer
Jan 2018 - Present
Intern
03/2014 to 05/2015
Graduated in 2010.
"""

pattern = r'\b(19\d{2}|20\d{2})\b.{1,30}?\b(19\d{2}|20\d{2}|present|current)\b'
matches = re.findall(pattern, text, re.IGNORECASE)
print("Matches:", matches)
