-- =============================================================================
-- Captura de leads de Meta Lead Ads (webhook `leadgen` + cron de respaldo).
--
-- - Lead: IDs de formulario, anuncio y campaña de Meta, y unicidad de
--   (organizationId, externalLeadId) para que reintentos del webhook no dupliquen leads.
-- - MetaLeadEvent: evento crudo recibido de Meta, con estado e intentos (nueva tabla).
--
-- Generado con: prisma migrate diff (schema de dev -> prisma/schema.prisma)
-- =============================================================================

-- El índice único falla si ya hay leads repetidos con el mismo externalLeadId (pudieron
-- cargarse a mano por la API). Se aborta con un mensaje claro en vez del error genérico.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Lead"
    WHERE "externalLeadId" IS NOT NULL
    GROUP BY "organizationId", "externalLeadId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Hay leads duplicados por (organizationId, externalLeadId); depúralos antes de aplicar esta migración.';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "externalAdId" TEXT,
ADD COLUMN     "externalCampaignId" TEXT,
ADD COLUMN     "externalFormId" TEXT;

-- CreateTable
CREATE TABLE "MetaLeadEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "leadgenId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "formId" TEXT,
    "adId" TEXT,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "leadId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaLeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaLeadEvent_leadgenId_key" ON "MetaLeadEvent"("leadgenId");

-- CreateIndex
CREATE INDEX "MetaLeadEvent_status_idx" ON "MetaLeadEvent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_organizationId_externalLeadId_key" ON "Lead"("organizationId", "externalLeadId");

-- AddForeignKey
ALTER TABLE "MetaLeadEvent" ADD CONSTRAINT "MetaLeadEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaLeadEvent" ADD CONSTRAINT "MetaLeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Tablas nuevas: RLS activado y sin acceso desde la Data API (la app usa Prisma como postgres).
ALTER TABLE "MetaLeadEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "MetaLeadEvent" FROM anon, authenticated;
