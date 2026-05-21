import requests

url = "https://dbrag.tybot.ma/auth/v1/health"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczMzI3MzU5fQ.-zXHkeShGO4omiW9rjNhlHXj50BCb06F5c599zaGYvQ"
}

try:
    print(f"Checking Auth Health with OLD KEY for {url}")
    res = requests.get(url, headers=headers)
    print(f"Status: {res.status_code}")
    print(f"Body: {res.text}")
except Exception as e:
    print(f"Error: {e}")
