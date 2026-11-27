-- =============================================================================
-- availability_blocks
-- Horarios que cada vendedor deja no disponibles en su agenda (comida, reuniones…).
-- Único (startsAt/endsAt) o semanal (weekdays + startTime/endTime en su zona horaria).
-- =============================================================================

CREATE TABLE IF NOT EXISTS "AvailabilityBlock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startsAt" TIMESTAMPTZ,
  "endsAt" TIMESTAMPTZ,
  "weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "startTime" TEXT,
  "endTime" TEXT,
  "timezone" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AvailabilityBlock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AvailabilityBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AvailabilityBlock_userId_idx" ON "AvailabilityBlock"("userId");
CREATE INDEX IF NOT EXISTS "AvailabilityBlock_organizationId_idx" ON "AvailabilityBlock"("organizationId");

-- RLS y seguridad multi-tenant (estándar del proyecto)
ALTER TABLE "AvailabilityBlock" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AvailabilityBlock" FROM anon, authenticated;
