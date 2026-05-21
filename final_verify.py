import os
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions as SupabaseClientOptions

# Manual workaround for the ClientOptions bug
class FixedClientOptions(SupabaseClientOptions):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not hasattr(self, 'storage'):
            self.storage = None

url = "https://dbrag.tybot.ma"
# Use service role key for inspection
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzMyNzM2MDAsImV4cCI6MTkzMTAzNjQwMH0.TJ4XZvbnfdNEyGufH2_gsnqBxX6TTnJTv_ac9asRMvg"

def check(schema):
    print(f"\nChecking {schema}...")
    try:
        # Create client without ClientOptions object if it's too buggy, 
        # or use a version that works
        options = FixedClientOptions(schema=schema)
        supabase = create_client(url, key, options=options)
        
        res = supabase.table("employees").select("id", count="exact").limit(5).execute()
        print(f"Employees: {res.count} records")
        if res.count > 0:
            print(f"Sample: {res.data}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check("public")
    check("rh")
