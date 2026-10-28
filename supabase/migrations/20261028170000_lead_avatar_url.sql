-- =============================================================================
-- lead_avatar_url
-- Añadir columna avatarUrl a Lead para foto de perfil de prospectos (Meta / WhatsApp)
-- =============================================================================

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

