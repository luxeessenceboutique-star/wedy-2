import psycopg2
import sys

def repair():
    # Paramètres de connexion trouvés dans le projet
    # On essaie d'abord l'hôte Supabase direct sur le port 6543 (souvent plus ouvert)
    # Project: vaimfbevkbcjjhtrrtdf
    DSN_LIST = [
        "postgresql://postgres:qacgjigYlsR0NXUUA2yG2lDF8Z@db.vaimfbevkbcjjhtrrtdf.supabase.co:6543/postgres",
        "postgresql://postgres:qacgjigYlsR0NXUUA2yG2lDF8Z@db.vaimfbevkbcjjhtrrtdf.supabase.co:5432/postgres",
        "postgresql://postgres:qacgjigYlsR0NXUUA2yG2lDF8Z@dbrag.tybot.ma:5432/postgres"
    ]
    
    SQL = """
    -- Ajout des colonnes nécessaires pour le recrutement
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS type text DEFAULT 'candidate';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cin text;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;

    -- Mise à jour des types de profils existants
    UPDATE public.profiles p SET type = 'employee' 
    WHERE EXISTS (SELECT 1 FROM public.employees e WHERE e.email = p.email);

    CREATE INDEX IF NOT EXISTS idx_profiles_type ON public.profiles(type);
    """

    success = False
    for DSN in DSN_LIST:
        try:
            print(f"Tentative de connexion à {DSN.split('@')[1]}...")
            conn = psycopg2.connect(DSN, connect_timeout=10)
            cur = conn.cursor()
            print("Exécution des modifications de structure...")
            cur.execute(SQL)
            conn.commit()
            print(f"Succès ! La table 'profiles' a été mise à jour via {DSN.split('@')[1]}.")
            success = True
            cur.close()
            conn.close()
            break
        except Exception as e:
            print(f"Échec pour ce serveur : {e}")
    
    if not success:
        print("\nERREUR : Impossible de se connecter à la base de données après plusieurs tentatives.")
        print("Il semble que les ports PostgreSQL (5432, 6543) soient bloqués par votre réseau.")
        print("Veuillez essayer de lancer ce script en étant connecté à un autre réseau (ex: partage de connexion mobile).") or print("")

if __name__ == "__main__":
    repair()
