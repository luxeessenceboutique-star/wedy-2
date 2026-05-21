import requests

url = "https://dbrag.tybot.ma/auth/v1/health"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczMjczNjAwLCJleHAiOjE5MzEwMzY0MDB9.Bc7K3icDfTOzFBILq7NrIP5WIJ95pmyl1WAagHp5RxM"
}

try:
    print(f"Checking Auth Health for {url}")
    res = requests.get(url, headers=headers)
    print(f"Status: {res.status_code}")
    print(f"Body: {res.text}")
except Exception as e:
    print(f"Error: {e}")
