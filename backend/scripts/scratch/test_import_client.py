"""Test the /api/templates/import endpoint using FastAPI TestClient to see the exact error."""
import sys, os, io
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_current_user, require_hr_or_admin

# Mock the authentication dependency to always return a valid HR user
def mock_require_hr_or_admin():
    return {"id": "test-user-id", "email": "test@tython.ma", "role_name": "hr", "full_name": "Test User"}

app.dependency_overrides[require_hr_or_admin] = mock_require_hr_or_admin

client = TestClient(app)

print("Starting TestClient request to /api/templates/import...")
pdf_path = r'c:\Users\manal_oicxxuu\Downloads\RH\ATTESTATION DE STAGE .pdf'

with open(pdf_path, 'rb') as f:
    files = {'file': ('attestation_stage.pdf', f, 'application/pdf')}
    data = {
        'name_fr': 'Test Import',
        'name_en': 'Test Import',
        'name_ar': 'Test Import',
        'category': 'attestation',
    }
    
    response = client.post(
        '/api/templates/import',
        files=files,
        data=data
    )

print(f"Response status: {response.status_code}")
print(f"Response body: {response.text}")
