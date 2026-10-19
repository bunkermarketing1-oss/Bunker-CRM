-- =============================================================================
-- Bajas de SMS globales por número e idempotencia de SMS.
--
-- - SmsOptOut: la baja es del número (E.164), no del lead ni de la organización. El número
--   de Twilio lo comparten todas las organizaciones, así que quien respondió BAJA/STOP no
--   debe recibir SMS de ningún cliente. Lead.smsOptOutAt se sigue escribiendo solo para
--   mostrarlo en la ficha del lead.
-- - Message.providerMsgId único: un reintento del webhook de Twilio no duplica la
--   respuesta. Postgres admite varios NULL en un índice único, así que los mensajes sin SID
--   (demo, fallidos) no chocan; equivale al índice parcial `WHERE providerMsgId IS NOT NULL`
--   y conserva el nombre que espera Prisma (@unique).
-- - Message.bulkBatchId + único (organizationId, bulkBatchId, recipient): un lote masivo
--   reenviado (timeout, doble clic) no manda dos SMS al mismo número.
--
-- Generado con: prisma migrate diff (schema de integracion/crm-comercial -> prisma/schema.prisma),
-- más la limpieza de duplicados y el backfill escritos a mano.
-- =============================================================================

-- Antes del índice único: si hubiera SIDs repetidos se conserva el mensaje más antiguo y a
-- los demás se les quita el SID (no se borra ninguna fila).
UPDATE "Message" AS m
SET "providerMsgId" = NULL
FROM (
    SELECT "id",
           ROW_NUMBER() OVER (PARTITION BY "providerMsgId" ORDER BY "createdAt", "id") AS rn
    FROM "Message"
    WHERE "providerMsgId" IS NOT NULL
) AS d
WHERE m."id" = d."id" AND d.rn > 1;

-- DropIndex
DROP INDEX "Message_providerMsgId_idx";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "bulkBatchId" TEXT;

-- CreateTable
CREATE TABLE "SmsOptOut" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "optedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keyword" TEXT NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "SmsOptOut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsOptOut_phone_key" ON "SmsOptOut"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Message_providerMsgId_key" ON "Message"("providerMsgId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_organizationId_bulkBatchId_recipient_key" ON "Message"("organizationId", "bulkBatchId", "recipient");

-- AddForeignKey
ALTER TABLE "SmsOptOut" ADD CONSTRAINT "SmsOptOut_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: cada número con un lead dado de baja queda de baja globalmente, con la fecha
-- de la baja más antigua y la organización de ese lead. `gen_random_uuid()` es nativo en
-- Postgres 13+ (Supabase); Prisma genera los ids en la app, aquí se generan en SQL.
INSERT INTO "SmsOptOut" ("id", "phone", "optedOutAt", "keyword", "organizationId")
SELECT DISTINCT ON (l."normalizedPhone")
       gen_random_uuid()::text,
       l."normalizedPhone",
       l."smsOptOutAt",
       'backfill_lead_sms_opt_out_at',
       l."organizationId"
FROM "Lead" AS l
WHERE l."smsOptOutAt" IS NOT NULL AND l."normalizedPhone" IS NOT NULL
ORDER BY l."normalizedPhone", l."smsOptOutAt"
ON CONFLICT ("phone") DO NOTHING;

-- Tablas nuevas: RLS activado y sin acceso desde la Data API (la app usa Prisma como postgres).
ALTER TABLE "SmsOptOut" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SmsOptOut" FROM anon, authenticated;
