"""Test the full template import flow end-to-end."""
import time, re, sys, os

# Add backend root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.routers.templates import _pdf_to_styled_html, _apply_variable_substitution
from app.services.ai_service import clean_template_html
from app.database import get_db

PDF_PATH = r'c:\Users\manal_oicxxuu\Downloads\RH\ATTESTATION DE STAGE .pdf'

with open(PDF_PATH, 'rb') as f:
    content = f.read()

print('Step 1: PDF to HTML...')
styled_html = _pdf_to_styled_html(content)
print(f'  OK - {len(styled_html)} chars')

print('Step 2: Variable substitution...')
pre_processed = _apply_variable_substitution(styled_html)
print('  OK')

print('Step 3: AI cleanup...')
try:
    body_template = clean_template_html(pre_processed)
    print(f'  OK - {len(body_template)} chars')
except Exception as e:
    body_template = pre_processed
    print(f'  FALLBACK (AI error: {e})')

print('Step 4: Extract variables...')
variables = sorted(set(re.findall(r'\{\{(\w+)\}\}', body_template)))
print(f'  Variables found: {variables}')

print('Step 5: Supabase insert...')
db = next(get_db())
name_fr = 'Test Attestation de Stage'
base_code = re.sub(r'[^\w]', '_', name_fr.lower())[:40]
code = f'{base_code}_{int(time.time()) % 100000}'
data = {
    'code': code,
    'name_fr': name_fr,
    'name_en': name_fr,
    'name_ar': name_fr,
    'category': 'attestation',
    'body_template': body_template,
    'variables': variables,
    'is_active': True,
}
try:
    result = db.table('document_templates').insert(data).execute()
    if result.data:
        record_id = result.data[0]['id']
        print(f'  INSERT OK: id={record_id}')
        db.table('document_templates').delete().eq('id', record_id).execute()
        print('  Cleanup done')
    else:
        print(f'  INSERT FAILED - no data returned: {result}')
except Exception as e:
    print(f'  INSERT ERROR: {e}')
