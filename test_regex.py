import re

text = "software engineer linkedin\nwith experience in software development and testing"
keyword = "software engineer"
print("Match 1:", re.search(r'\b' + re.escape(keyword) + r'\b', text))

keyword2 = "software development"
print("Match 2:", re.search(r'\b' + re.escape(keyword2) + r'\b', text))
