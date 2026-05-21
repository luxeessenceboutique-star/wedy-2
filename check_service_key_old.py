import requests

url = "https://dbrag.tybot.ma/rest/v1/employees?select=id&limit=1"
# THE OLD SERVICE ROLE KEY
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzMzMjczNjl9.rjX0S8mMVBWOhL4QVklBtFvdQjzRjyom8e_l2IaxlHo"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Accept-Profile": "public" # Start with public
}

try:
    print(f"Checking API with OLD SERVICE ROLE KEY for {url}")
    res = requests.get(url, headers=headers)
    print(f"Status: {res.status_code}")
    print(f"Body: {res.text}")
except Exception as e:
    print(f"Error: {e}")
