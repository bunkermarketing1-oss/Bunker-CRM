-- =============================================================================
-- Asistente de IA fuera de horario (por cliente).
--
-- - ClientAiAssistant: una fila por cliente con el interruptor, la zona horaria (IANA), el
--   horario de atención por día (JSON en texto, igual que AutomationRule.conditionJson), la
--   base de conocimiento, las indicaciones de tono, el tope de respuestas por conversación
--   y el mensaje de traspaso a un asesor. Se borra junto con el cliente.
-- - Message.generatedBy: marca explícita de los SMS que mandó el asistente ("ai") o su
--   mensaje de traspaso ("ai_handoff"). null = asesor o automatización (todas las filas
--   existentes), así que no hace falta backfill.
--
-- Generado con: prisma migrate diff (schema de integracion/crm-comercial -> prisma/schema.prisma),
-- sin conexión a ninguna base.
-- =============================================================================

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "generatedBy" TEXT;

-- CreateTable
CREATE TABLE "ClientAiAssistant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "businessHoursJson" TEXT NOT NULL,
    "knowledgeBase" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT,
    "handoffMessage" TEXT NOT NULL,
    "maxRepliesPerDay" INTEGER NOT NULL DEFAULT 3,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAiAssistant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientAiAssistant_clientId_key" ON "ClientAiAssistant"("clientId");

-- CreateIndex
CREATE INDEX "ClientAiAssistant_organizationId_idx" ON "ClientAiAssistant"("organizationId");

-- AddForeignKey
ALTER TABLE "ClientAiAssistant" ADD CONSTRAINT "ClientAiAssistant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAiAssistant" ADD CONSTRAINT "ClientAiAssistant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tablas nuevas: RLS activado y sin acceso desde la Data API (la app usa Prisma como postgres).
ALTER TABLE "ClientAiAssistant" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ClientAiAssistant" FROM anon, authenticated;
