-- =============================================================================
-- Integraciones sociales (Meta / TikTok) y métricas de campañas por cliente.
--
-- - ConnectedAccount: tipo de cuenta, token OAuth cifrado (AES-256-GCM en la app),
--   expiración, permisos, última sincronización y cliente asignado por el admin.
-- - Campaign: ID externo de la plataforma, moneda, tipo de presupuesto y alcance.
-- - CampaignMetric: métricas diarias por campaña (nueva tabla).
--
-- Generado con: prisma migrate diff (schema de main -> prisma/schema.prisma)
-- =============================================================================

-- AlterTable
ALTER TABLE "ConnectedAccount" ADD COLUMN     "accessTokenEnc" TEXT,
ADD COLUMN     "accountType" TEXT,
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "scopes" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "budgetType" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "reach" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CampaignMetric" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMetric_campaignId_date_key" ON "CampaignMetric"("campaignId", "date");

-- CreateIndex
CREATE INDEX "ConnectedAccount_clientId_idx" ON "ConnectedAccount"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_integrationId_accountType_externalId_key" ON "ConnectedAccount"("integrationId", "accountType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_connectedAccountId_externalId_key" ON "Campaign"("connectedAccountId", "externalId");

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMetric" ADD CONSTRAINT "CampaignMetric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Toda tabla nueva nace con RLS activado y sin acceso desde la Data API.
-- La app accede solo vía Prisma (rol postgres), que no está sujeto a RLS.
ALTER TABLE "CampaignMetric" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CampaignMetric" FROM anon, authenticated;
