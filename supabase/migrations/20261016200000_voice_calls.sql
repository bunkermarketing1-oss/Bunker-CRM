-- =============================================================================
-- Llamadas de voz con Twilio.
--
-- - PhoneLine: números de Twilio registrados como líneas, asignados a un cliente.
-- - Call: cada llamada saliente/entrante, con su conferencia (escucha en vivo),
--   estado, duración y grabación.
--
-- Generado con: prisma migrate diff (schema de feat/twilio-sms-inbound-bulk -> prisma/schema.prisma)
-- =============================================================================

-- CreateTable
CREATE TABLE "PhoneLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "recordCalls" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "leadId" TEXT,
    "userId" TEXT,
    "lineId" TEXT,
    "direction" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "conferenceName" TEXT,
    "agentCallSid" TEXT,
    "customerCallSid" TEXT,
    "durationSec" INTEGER,
    "recordingSid" TEXT,
    "recordingUrl" TEXT,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhoneLine_phoneNumber_key" ON "PhoneLine"("phoneNumber");

-- CreateIndex
CREATE INDEX "PhoneLine_organizationId_idx" ON "PhoneLine"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Call_conferenceName_key" ON "Call"("conferenceName");

-- CreateIndex
CREATE INDEX "Call_organizationId_createdAt_idx" ON "Call"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Call_organizationId_status_idx" ON "Call"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Call_customerCallSid_idx" ON "Call"("customerCallSid");

-- CreateIndex
CREATE INDEX "Call_agentCallSid_idx" ON "Call"("agentCallSid");

-- AddForeignKey
ALTER TABLE "PhoneLine" ADD CONSTRAINT "PhoneLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneLine" ADD CONSTRAINT "PhoneLine_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "PhoneLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Tablas nuevas: RLS activado y sin acceso desde la Data API (la app usa Prisma como postgres).
ALTER TABLE "PhoneLine" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PhoneLine" FROM anon, authenticated;
ALTER TABLE "Call" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Call" FROM anon, authenticated;
