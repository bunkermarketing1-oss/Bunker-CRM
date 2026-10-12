const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Bunker CRM database...");

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: "bunker-agency" },
    update: {},
    create: {
      name: "Bunker Marketing Agency",
      slug: "bunker-agency",
      plan: "enterprise_hybrid",
    },
  });

  // 2. Create Users
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@bunkermarketing.io" },
    update: {},
    create: {
      email: "admin@bunkermarketing.io",
      name: "Dirección Bunker",
      passwordHash: "managed_by_supabase_auth", // Authentication is handled by Supabase Auth; never store passwords here
      role: "admin",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: "carlos.sales@bunkermarketing.io" },
    update: {},
    create: {
      email: "carlos.sales@bunkermarketing.io",
      name: "Carlos Méndez (Comercial)",
      passwordHash: "managed_by_supabase_auth",
      role: "sales_rep",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    },
  });

  const mktUser = await prisma.user.upsert({
    where: { email: "sofia.marketing@bunkermarketing.io" },
    update: {},
    create: {
      email: "sofia.marketing@bunkermarketing.io",
      name: "Sofía Castillo (Marketing)",
      passwordHash: "managed_by_supabase_auth",
      role: "marketing_specialist",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    },
  });

  // Connect members
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: adminUser.id } },
    update: {},
    create: { organizationId: org.id, userId: adminUser.id, role: "admin" },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: salesUser.id } },
    update: {},
    create: { organizationId: org.id, userId: salesUser.id, role: "sales_rep" },
  });

  // 3. Pipeline Stages
  const stageDefs = [
    { name: "Prospecto Nuevo", order: 1, color: "#64748b" },
    { name: "Contactado / Calificado", order: 2, color: "#3b82f6" },
    { name: "Propuesta Enviada", order: 3, color: "#8b5cf6" },
    { name: "En Negociación", order: 4, color: "#f59e0b" },
    { name: "Cerrado Ganado", order: 5, color: "#10b981" },
    { name: "Perdido", order: 6, color: "#ef4444" },
  ];

  const stages = [];
  for (const s of stageDefs) {
    let stage = await prisma.pipelineStage.findFirst({
      where: { organizationId: org.id, name: s.name },
    });
    if (!stage) {
      stage = await prisma.pipelineStage.create({
        data: {
          organizationId: org.id,
          name: s.name,
          order: s.order,
          color: s.color,
        },
      });
    }
    stages.push(stage);
  }

  // 4. Seed Clients
  const clientData = [
    {
      name: "Grupo Inmobiliario Altamira",
      companyName: "Altamira Real Estate",
      email: "contacto@altamirarealestate.com",
      phone: "+52 55 4912 3011",
      website: "https://altamirarealestate.com",
      industry: "Bienes Raíces",
      status: "active",
      revenue: 85000,
      notes: "Campaña de captación de inversionistas de lujo activa en Meta y Google Ads.",
      isDemo: true,
      ownerId: salesUser.id,
      organizationId: org.id,
    },
    {
      name: "Clínicas Odontológicas DentPrime",
      companyName: "DentPrime Corp",
      email: "direccion@dentprime.mx",
      phone: "+52 55 7712 9940",
      website: "https://dentprime.mx",
      industry: "Salud y Belleza",
      status: "active",
      revenue: 42000,
      notes: "Automatización de citas con recordatorios SMS y Meta Ads de conversión.",
      isDemo: true,
      ownerId: salesUser.id,
      organizationId: org.id,
    },
    {
      name: "FinTech Soluciones Ya",
      companyName: "SolucionesYa S.A. de C.V.",
      email: "growth@solucionesya.io",
      phone: "+52 55 3301 4488",
      website: "https://solucionesya.io",
      industry: "FinTech / SaaS",
      status: "active",
      revenue: 120000,
      notes: "Lead generation B2B y campañas de TikTok Ads para captación masiva.",
      isDemo: true,
      ownerId: adminUser.id,
      organizationId: org.id,
    },
  ];

  const clients = [];
  for (const c of clientData) {
    let client = await prisma.client.findFirst({
      where: { organizationId: org.id, name: c.name },
    });
    if (!client) {
      client = await prisma.client.create({ data: c });
    }
    clients.push(client);
  }

  // 5. Seed Leads
  const leadData = [
    {
      name: "Lic. Roberto Garza",
      companyName: "Cadena de Restaurantes Sonora Grill Express",
      email: "roberto.garza@sonoragrillexpress.com",
      phone: "+52 81 8392 4012",
      source: "meta_ads",
      status: "contacted",
      qualification: 88,
      aiSummary: "Alta intención de contratación de pauta en Meta y producción de contenido social para 8 sucursales. Presupuesto estimado > $4,000 USD/mes.",
      estimatedValue: 48000,
      isDemo: true,
      ownerId: salesUser.id,
      organizationId: org.id,
    },
    {
      name: "Dra. Marcela Figueroa",
      companyName: "Instituto de Cirugía Plástica y Estética",
      email: "dra.figueroa@esteticaavanzada.com",
      phone: "+52 33 3612 8840",
      source: "google_ads",
      status: "qualified",
      qualification: 94,
      aiSummary: "Busca migrar de agencia actual. Interesada en embudo híbrido: Google Search Ads + Calificación con IA + WhatsApp/SMS.",
      estimatedValue: 65000,
      isDemo: true,
      ownerId: salesUser.id,
      organizationId: org.id,
    },
    {
      name: "Arq. Alejandro Benítez",
      companyName: "Benítez Arquitectura & Diseño",
      email: "alejandro@benitezarq.com",
      phone: "+52 55 9182 3311",
      source: "referral",
      status: "new",
      qualification: 72,
      aiSummary: "Nuevo lead registrado por formulario web. Requiere branding completo y campaña inaugural de preventa de departamentos.",
      estimatedValue: 32000,
      isDemo: true,
      ownerId: salesUser.id,
      organizationId: org.id,
    },
    {
      name: "Ing. Javier Morales",
      companyName: "Logística y Transporte TransMex",
      email: "jmorales@transmexlogistics.com",
      phone: "+52 55 6281 9901",
      source: "website",
      status: "new",
      qualification: 60,
      aiSummary: "Lead B2B interesado en automatización de prospección en frío.",
      estimatedValue: 25000,
      isDemo: true,
      ownerId: adminUser.id,
      organizationId: org.id,
    },
  ];

  const leads = [];
  for (const l of leadData) {
    let lead = await prisma.lead.findFirst({
      where: { organizationId: org.id, email: l.email },
    });
    if (!lead) {
      lead = await prisma.lead.create({ data: l });
    }
    leads.push(lead);
  }

  // 6. Seed Opportunities in Pipeline
  const oppData = [
    {
      title: "Campaña Anual Preventa Altamira Luxury",
      value: 95000,
      probability: 80,
      status: "open",
      stageId: stages[3].id, // En Negociación
      clientId: clients[0].id,
      isDemo: true,
      organizationId: org.id,
    },
    {
      title: "Plan Marketing Híbrido Estética Avanzada",
      value: 65000,
      probability: 60,
      status: "open",
      stageId: stages[2].id, // Propuesta Enviada
      leadId: leads[1].id,
      isDemo: true,
      organizationId: org.id,
    },
    {
      title: "Captación Pauta Digital Sonora Grill",
      value: 48000,
      probability: 40,
      status: "open",
      stageId: stages[1].id, // Contactado
      leadId: leads[0].id,
      isDemo: true,
      organizationId: org.id,
    },
    {
      title: "Automatización Funnel DentPrime",
      value: 42000,
      probability: 100,
      status: "won",
      stageId: stages[4].id, // Cerrado Ganado
      clientId: clients[1].id,
      isDemo: true,
      organizationId: org.id,
    },
  ];

  for (const opp of oppData) {
    const existing = await prisma.opportunity.findFirst({
      where: { organizationId: org.id, title: opp.title },
    });
    if (!existing) {
      await prisma.opportunity.create({ data: opp });
    }
  }

  // 7. Seed Activities (Calls, meetings)
  const actData = [
    {
      type: "call",
      title: "Llamada de descubrimiento y requerimientos comerciales",
      description: "Se validó presupuesto de inversión mensual en medios y dolores con su agencia anterior.",
      outcome: "completed",
      clientId: clients[0].id,
      userId: salesUser.id,
    },
    {
      type: "meeting",
      title: "Presentación de estrategia y propuesta comercial",
      description: "Reunión virtual por Google Meet con dirección general para revisar métricas de retorno.",
      outcome: "completed",
      clientId: clients[1].id,
      userId: adminUser.id,
    },
  ];

  for (const a of actData) {
    await prisma.activity.create({ data: a });
  }

  // 8. Seed Tasks
  const taskData = [
    {
      title: "Enviar cotización ajustada con cláusula de rendimiento",
      priority: "high",
      status: "pending",
      dueDate: new Date(Date.now() + 86400000 * 2), // in 2 days
      clientId: clients[0].id,
      userId: salesUser.id,
    },
    {
      title: "Configurar píxel de Meta y eventos de conversión",
      priority: "medium",
      status: "pending",
      dueDate: new Date(Date.now() + 86400000 * 4),
      clientId: clients[1].id,
      userId: mktUser.id,
    },
  ];

  for (const t of taskData) {
    await prisma.task.create({ data: t });
  }

  // 9. Seed Integrations (Real states as requested by Rule #6: no fake success)
  const integrationDefs = [
    {
      provider: "meta",
      name: "Meta for Business (Facebook & Instagram)",
      description: "Páginas oficiales, catálogo de anuncios y sincronización de leads de Meta Ads.",
      status: "pending_credentials",
      errorMessage: "Falta configurar META_APP_ID y META_APP_SECRET en las variables de entorno.",
      organizationId: org.id,
    },
    {
      provider: "google_ads",
      name: "Google Ads & Analytics",
      description: "Métricas de búsqueda, display, YouTube Ads y seguimiento de conversiones.",
      status: "pending_credentials",
      errorMessage: "Falta configurar GOOGLE_ADS_CLIENT_ID y GOOGLE_ADS_DEVELOPER_TOKEN.",
      organizationId: org.id,
    },
    {
      provider: "tiktok",
      name: "TikTok for Business",
      description: "Campañas de video de alta conversión y sincronización de audiencias TikTok Ads.",
      status: "pending_credentials",
      errorMessage: "Falta configurar TIKTOK_APP_ID y autorizar la aplicación de anunciante.",
      organizationId: org.id,
    },
    {
      provider: "twilio",
      name: "Twilio SMS & Mensajería",
      description: "Envío real de alertas SMS, recordatorios automáticos de reuniones y confirmaciones.",
      status: "pending_credentials",
      errorMessage: "Falta configurar TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en .env.",
      organizationId: org.id,
    },
  ];

  for (const it of integrationDefs) {
    const existing = await prisma.integration.findFirst({
      where: { organizationId: org.id, provider: it.provider },
    });
    if (!existing) {
      await prisma.integration.create({ data: it });
    }
  }

  // 10. Seed Demo Social Posts & SMS
  await prisma.socialPost.create({
    data: {
      organizationId: org.id,
      content: "🚀 ¿Tu inmobiliaria aún no califica leads con Inteligencia Artificial? En Bunker Agency diseñamos el embudo híbrido que multiplica tu tasa de cierre. Agenda tu demo.",
      platformsJson: JSON.stringify(["instagram", "facebook"]),
      scheduledFor: new Date(Date.now() + 86400000 * 3),
      status: "scheduled",
      isDemo: true,
    },
  });

  await prisma.message.create({
    data: {
      organizationId: org.id,
      clientId: clients[0].id,
      channel: "sms",
      direction: "outbound",
      recipient: "+525549123011",
      body: "Hola Roberto, confirmamos tu sesión de estrategia comercial para mañana a las 11:00 AM con Bunker Agency.",
      status: "sent",
      isDemo: true,
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
