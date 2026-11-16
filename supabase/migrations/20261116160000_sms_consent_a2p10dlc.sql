-- =============================================================================
-- sms_consent_a2p10dlc
-- Consentimiento explícito para comunicaciones SMS y telefonía (Twilio A2P 10DLC / CTIA)
-- =============================================================================

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "smsConsent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "smsConsentAt" TIMESTAMPTZ DEFAULT now();
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "smsConsentSource" TEXT DEFAULT 'manual';

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "smsConsent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "smsConsentAt" TIMESTAMPTZ DEFAULT now();
