import requests

url = "https://dbrag.tybot.ma/rest/v1/employees"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzMyNzM2MDAsImV4cCI6MTkzMTAzNjQwMH0.TJ4XZvbnfdNEyGufH2_gsnqBxX6TTnJTv_ac9asRMvg"

def check(schema):
    print(f"\nChecking {schema}...")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept-Profile": schema,
        "Range-Unit": "items",
        "Prefer": "count=exact"
    }
    try:
        # We use a HEAD request or a limited GET to get the count
        response = requests.get(url + "?select=id&limit=1", headers=headers)
        if response.status_code == 200:
            count = response.headers.get("Content-Range", "0-0/0").split("/")[-1]
            print(f"Success! Count: {count}")
        else:
            print(f"Failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check("public")
    check("rh")
