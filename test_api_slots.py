import requests
import json

URL = "http://localhost:8000/api/creneaux"

slots = [
    {
        "date": "2026-05-15",
        "start_time": "14:00",
        "end_time": "14:30"
    },
    {
        "date": "2026-05-15",
        "start_time": "14:30",
        "end_time": "15:00"
    }
]

print("Posting 2 slots to /api/creneaux...")
try:
    res = requests.post(URL, json=slots)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    
    # Check if they are listed
    list_res = requests.get(URL)
    all_slots = list_res.json()
    print(f"Total slots now: {len(all_slots)}")
    
    # Check the file content
    with open('backend/data/recruitment.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        print(f"File creneaux count: {len(data['creneaux'])}")
except Exception as e:
    print(f"Error: {e}")
