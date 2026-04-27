import psycopg2
import sys

def main():
    try:
        conn = psycopg2.connect("postgresql://postgres:qacgjigYlsR0NXUUA2yG2lDF8Z@dbrag.tybot.ma:5432/postgres")
        cur = conn.cursor()
        with open('c:/Users/HP/Desktop/platform-RH/backend/cv_data_migration.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
        cur.execute(sql)
        conn.commit()
        print("Migration executed successfully.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
