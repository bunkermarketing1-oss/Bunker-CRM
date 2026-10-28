-- =============================================================================
-- message_inbox_performance_indexes
-- Índices de alto rendimiento para la bandeja de entrada omnicanal y consultas de mensajes por cliente/lead
-- =============================================================================

CREATE INDEX IF NOT EXISTS "Message_clientId_createdAt_idx" ON "Message"("clientId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Message_org_client_createdAt_idx" ON "Message"("organizationId", "clientId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Message_org_createdAt_idx" ON "Message"("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Message_leadId_idx" ON "Message"("leadId");
CREATE INDEX IF NOT EXISTS "Message_channel_idx" ON "Message"("channel");
CREATE INDEX IF NOT EXISTS "Message_org_recipient_createdAt_idx" ON "Message"("organizationId", "recipient", "createdAt");
CREATE INDEX IF NOT EXISTS "Lead_clientId_idx" ON "Lead"("clientId");
CREATE INDEX IF NOT EXISTS "Lead_organizationId_idx" ON "Lead"("organizationId");
