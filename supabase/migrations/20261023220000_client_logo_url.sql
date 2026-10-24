-- =============================================================================
-- client_logo_url
-- Añadir columna logoUrl a Client para foto / logo de la empresa
-- =============================================================================

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
