import requests
import json
import time

BASE_URL = "http://localhost:8000/api"
email = "admin.rh@wedy.ma"
password = "admin1234"

def simulate():
    print("--- Simulating User Workflow ---")
    
    # 1. Login
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
        print(f"Login failed: {res.text}")
        return
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Logged in. User: {res.json()['email']}")

    # 2. List initial slots
    res = requests.get(f"{BASE_URL}/creneaux", headers=headers)
    initial_count = len(res.json())
    print(f"Initial slots count: {initial_count}")

    # 3. Add new slots (mimicking the bulk generation)
    new_slots = [
        {"date": "2026-05-18", "start_time": "10:00", "end_time": "10:15", "status": "free"},
        {"date": "2026-05-18", "start_time": "10:15", "end_time": "10:30", "status": "free"}
    ]
    print(f"Adding {len(new_slots)} slots...")
    res = requests.post(f"{BASE_URL}/creneaux", json=new_slots, headers=headers)
    print(f"POST Status: {res.status_code}")
    if res.status_code != 200:
        print(f"POST Failed: {res.text}")
        return

    # 4. List again immediately
    res = requests.get(f"{BASE_URL}/creneaux", headers=headers)
    after_count = len(res.json())
    print(f"Slots count after POST: {after_count}")
    
    if after_count != initial_count + 2:
        print("ERROR: Count did not increase as expected!")
    else:
        print("Success: Count increased.")

    # 5. Wait a bit (simulate leaving page)
    print("Waiting 2 seconds...")
    time.sleep(2)

    # 6. Re-list (simulate re-entering page)
    res = requests.get(f"{BASE_URL}/creneaux", headers=headers)
    final_count = len(res.json())
    print(f"Final slots count: {final_count}")

    if final_count != after_count:
        print("ERROR: Slots disappeared!")
    else:
        print("SUCCESS: Slots persistent.")

if __name__ == "__main__":
    simulate()
