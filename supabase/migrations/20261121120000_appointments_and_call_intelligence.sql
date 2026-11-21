-- =============================================================================
-- appointments_and_call_intelligence
-- Módulo de Citas y Calendario Comercial (Booking) e Inteligencia de Llamadas
-- =============================================================================

-- 1. Tabla de Citas Comerciales (Appointments)
CREATE TABLE IF NOT EXISTS "Appointment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "clientId" TEXT,
  "leadId" TEXT,
  "userId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "scheduledAt" TIMESTAMPTZ NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 45,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "locationType" TEXT NOT NULL DEFAULT 'in_store',
  "locationAddress" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "customerNotes" TEXT,
  "internalNotes" TEXT,
  "reminder24hSent" BOOLEAN NOT NULL DEFAULT false,
  "reminder2hSent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Appointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Appointment_organizationId_scheduledAt_idx" ON "Appointment"("organizationId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Appointment_clientId_scheduledAt_idx" ON "Appointment"("clientId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Appointment_userId_scheduledAt_idx" ON "Appointment"("userId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Appointment_leadId_idx" ON "Appointment"("leadId");
CREATE INDEX IF NOT EXISTS "Appointment_status_idx" ON "Appointment"("status");

-- RLS y seguridad multi-tenant (estándar del proyecto)
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Appointment" FROM anon, authenticated;

-- 2. Campos para Inteligencia de Llamadas (Transcripción, Minuta y Resumen IA)
ALTER TABLE "Call" ADD COLUMN IF NOT EXISTS "transcriptionText" TEXT;
ALTER TABLE "Call" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT;
ALTER TABLE "Call" ADD COLUMN IF NOT EXISTS "aiKeyTakeaways" TEXT;
ALTER TABLE "Call" ADD COLUMN IF NOT EXISTS "aiActionItems" TEXT;
ALTER TABLE "Call" ADD COLUMN IF NOT EXISTS "aiSentiment" TEXT;

-- 3. Configuración de Agendamiento en el Cliente (Booking Link)
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bookingSlug" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bookingTitle" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bookingNotice" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bookingDurationMin" INTEGER DEFAULT 45;
CREATE UNIQUE INDEX IF NOT EXISTS "Client_bookingSlug_key" ON "Client"("bookingSlug");
