-- =============================================================================
-- Cierre de la Data API de Supabase (PostgREST) sobre el esquema public.
--
-- La app accede a la base SOLO vía Prisma (rol postgres, que ignora RLS). Supabase
-- expone las tablas de public a los roles anon/authenticated a través de la
-- NEXT_PUBLIC_SUPABASE_ANON_KEY, que es pública. Las tablas de la migración base
-- se crearon sin RLS, así que eran legibles por cualquiera con esa clave.
--
-- RLS activado SIN políticas = acceso denegado para anon/authenticated.
-- Si en el futuro se usa la Data API desde el navegador, se añaden políticas
-- explícitas en una migración nueva.
-- =============================================================================

ALTER TABLE "User"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PipelineStage"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Opportunity"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConnectedAccount"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialPost"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationRule"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"           ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Tablas, secuencias y funciones futuras creadas por postgres tampoco quedan expuestas
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
