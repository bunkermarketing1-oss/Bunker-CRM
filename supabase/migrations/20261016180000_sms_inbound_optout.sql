-- =============================================================================
-- SMS entrantes, estados de entrega y bajas.
--
-- - Lead.smsOptOutAt: el lead respondió BAJA/STOP; no se le envían más SMS.
-- - Message: índices para los callbacks de estado de Twilio (providerMsgId) y para
--   asociar una respuesta entrante al último SMS enviado a ese número.
--
-- Generado con: prisma migrate diff (schema de feat/sms-lead-qualification -> prisma/schema.prisma)
-- =============================================================================

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "smsOptOutAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_providerMsgId_idx" ON "Message"("providerMsgId");

-- CreateIndex
CREATE INDEX "Message_recipient_createdAt_idx" ON "Message"("recipient", "createdAt");

