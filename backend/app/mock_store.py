import json
import os
from uuid import uuid4

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "recruitment.json")
# This path points to c:\Users\pc\Desktop\platform-RH\data\recruitment.json

def load_data():
    if not os.path.exists(DATA_FILE):
        return {"annonces": [], "creneaux": [], "entretiens": []}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    from datetime import date, datetime
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(
            data, 
            f, 
            indent=4, 
            ensure_ascii=False,
            default=lambda o: o.isoformat() if isinstance(o, (date, datetime)) else str(o)
        )

def get_collection(collection_name):
    return load_data().get(collection_name, [])

def get_item(collection_name, item_id):
    data = load_data()
    for item in data.get(collection_name, []):
        if str(item.get("id")) == str(item_id):
            return item
    return None

def add_item(collection_name, item):
    data = load_data()
    if "id" not in item:
        item["id"] = str(uuid4())
    data[collection_name].append(item)
    save_data(data)
    return item

def delete_item(collection_name, item_id):
    data = load_data()
    data[collection_name] = [i for i in data[collection_name] if str(i.get("id")) != str(item_id)]
    save_data(data)

def update_item(collection_name, item_id, updates):
    data = load_data()
    for item in data[collection_name]:
        if str(item.get("id")) == str(item_id):
            item.update(updates)
            break
    save_data(data)
