"""Test the /api/templates/import endpoint directly with a real auth token."""
import sys, os, requests, time

# Get credentials from .env
env = {}
with open(r'c:\Users\manal_oicxxuu\Downloads\RH\platform-RH\backend\.env') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k] = v

BASE_URL = 'http://127.0.0.1:8000'

# Try to get all users via the auth endpoint
print("Step 1: Login to get token...")
# We need to find a valid user. Let's try the default credentials.
login_attempts = [
    ('admin@tython.ma', 'admin123'),
    ('hr@tython.ma', 'hr123456'),
    ('admin@example.com', 'admin123'),
]

token = None
for email, password in login_attempts:
    try:
        resp = requests.post(f'{BASE_URL}/api/auth/login', json={'email': email, 'password': password}, timeout=10)
        if resp.status_code == 200:
            token = resp.json().get('access_token')
            print(f"  Login OK with {email}: token={token[:30]}...")
            break
        else:
            print(f"  Login failed for {email}: {resp.status_code} - {resp.text[:100]}")
    except Exception as e:
        print(f"  Login error for {email}: {e}")

if not token:
    print("Could not get auth token. Exiting.")
    sys.exit(1)

# Now test the import endpoint
print("\nStep 2: Upload PDF to /api/templates/import...")
pdf_path = r'c:\Users\manal_oicxxuu\Downloads\RH\ATTESTATION DE STAGE .pdf'

with open(pdf_path, 'rb') as f:
    files = {'file': ('attestation_stage.pdf', f, 'application/pdf')}
    data = {
        'name_fr': f'Test Import {int(time.time()) % 10000}',
        'name_en': 'Test Import',
        'name_ar': 'Test Import',
        'category': 'attestation',
    }
    resp = requests.post(
        f'{BASE_URL}/api/templates/import',
        files=files,
        data=data,
        headers={'Authorization': f'Bearer {token}'},
        timeout=120,
    )

print(f"  Response status: {resp.status_code}")
print(f"  Response body: {resp.text[:500]}")

if resp.status_code == 201:
    result = resp.json()
    template_id = result.get('template', {}).get('id') or result.get('id')
    if template_id:
        print(f"  Template created: id={template_id}")
        # Clean up
        del_resp = requests.delete(
            f'{BASE_URL}/api/templates/{template_id}',
            headers={'Authorization': f'Bearer {token}'},
        )
        print(f"  Cleanup: {del_resp.status_code}")
else:
    print(f"  IMPORT FAILED!")
