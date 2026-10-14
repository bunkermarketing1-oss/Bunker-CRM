-- Bunker CRM — Endurecimiento de Supabase
--
-- La app accede a la base SOLO vía Prisma (rol postgres, que ignora RLS). Supabase
-- expone además todas las tablas de `public` por su Data API (PostgREST) a los roles
-- `anon` y `authenticated`, usando la NEXT_PUBLIC_SUPABASE_ANON_KEY, que es pública.
--
-- Este script activa RLS SIN políticas en todas las tablas de `public` y revoca los
-- permisos de esos roles: la Data API queda cerrada y Prisma sigue funcionando igual.
-- Es idempotente; se ejecuta después de cada `prisma db push` (ver script db:push).

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END
$$;

-- Tablas que se creen en el futuro dentro de `public` tampoco quedarán expuestas
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
