-- =============================================================================
-- Automatizaciones por cliente: una regla puede aplicar a un solo cliente
-- (p. ej. el SMS de bienvenida de Carrito Naranja) o, con clientId null, a todos.
-- Al borrar el cliente se borran sus reglas: no tienen sentido sin él.
--
-- Generado con: prisma migrate diff (schema de feat/meta-leads -> prisma/schema.prisma)
-- =============================================================================

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE INDEX "AutomationRule_organizationId_triggerEvent_isActive_idx" ON "AutomationRule"("organizationId", "triggerEvent", "isActive");

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

