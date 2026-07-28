import requests
import json

url = "http://127.0.0.1:8000/api/upload"
filepath = "/Users/raadey/SEPM/Industry-Classification-System/Software Engineer Google Docs Resume Template.pdf"

with open(filepath, "rb") as f:
    files = {"files": ("Software Engineer Google Docs Resume Template.pdf", f, "application/pdf")}
    response = requests.post(url, files=files)

print("Status Code:", response.status_code)
print("Response JSON:")
print(json.dumps(response.json(), indent=2))
