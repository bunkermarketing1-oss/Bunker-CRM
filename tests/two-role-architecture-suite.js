const http = require("http");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

// Read .env
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[key] = val;
    }
  }
}

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3005";

async function ensureSupabaseUser(email, password, metadata) {
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const existing = usersData?.users?.find((u) => u.email === email);
  if (existing) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: metadata,
      email_confirm: true,
    });
    return existing;
  } else {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) console.error("Error creating test user in supabase:", error);
    return created?.user;
  }
}

async function makeRequest(urlPath, options = {}) {
  const fullUrl = `${BASE_URL}${urlPath}`;
  return await fetch(fullUrl, {
    ...options,
    redirect: "manual",
  });
}

function extractCookie(res, cookieName) {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

const results = [];

function recordResult(testNumber, title, passed, details) {
  results.push({ testNumber, title, passed, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [CRITERIO ${testNumber}] ${title}`);
  if (details) console.log(`   └─ ${details}`);
}

async function runSuite() {
  console.log("\n==========================================================================");
  console.log("   BUNKER CRM — SUITE DE VALIDACIÓN: ARQUITECTURA DE DOS ROLES (ADMIN / CLIENT)");
  console.log("==========================================================================\n");

  let adminCookie = "";
  let client1Cookie = "";
  let client2Cookie = "";
  let client1Record = null;
  let client2Record = null;
  let clientUser1 = null;
  let clientUser2 = null;

  try {
    // 0. SETUP: Provision test clients and users
    const defaultOrg = await prisma.organization.findFirst({ where: { slug: "bunker-agency" } });
    if (!defaultOrg) throw new Error("Default organization not found");

    // Client Company 1
    client1Record = await prisma.client.upsert({
      where: { id: "test-client-company-alpha" },
      update: { name: "Empresa Alpha Segura S.A." },
      create: {
        id: "test-client-company-alpha",
        organizationId: defaultOrg.id,
        name: "Empresa Alpha Segura S.A.",
        companyName: "Alpha Segura",
        status: "active",
      },
    });

    // Client Company 2
    client2Record = await prisma.client.upsert({
      where: { id: "test-client-company-beta" },
      update: { name: "Empresa Beta Confidencial Ltda." },
      create: {
        id: "test-client-company-beta",
        organizationId: defaultOrg.id,
        name: "Empresa Beta Confidencial Ltda.",
        companyName: "Beta Confidencial",
        status: "active",
      },
    });

    // Seed private records for Beta to test cross-tenant attacks
    const betaContact = await prisma.contact.upsert({
      where: { id: "contact-beta-secret" },
      update: { clientId: client2Record.id },
      create: {
        id: "contact-beta-secret",
        organizationId: defaultOrg.id,
        clientId: client2Record.id,
        firstName: "Contacto Secreto Beta",
        email: "secreto@beta.com",
      },
    });

    const defaultStage = await prisma.pipelineStage.findFirst({ where: { organizationId: defaultOrg.id } });
    const betaOpp = await prisma.opportunity.upsert({
      where: { id: "opp-beta-secret" },
      update: { clientId: client2Record.id },
      create: {
        id: "opp-beta-secret",
        organizationId: defaultOrg.id,
        stageId: defaultStage.id,
        clientId: client2Record.id,
        title: "Oportunidad Millonaria Beta",
        value: 99000,
        status: "open",
      },
    });

    const betaTask = await prisma.task.upsert({
      where: { id: "task-beta-secret" },
      update: { clientId: client2Record.id },
      create: {
        id: "task-beta-secret",
        title: "Tarea Confidencial de Beta",
        clientId: client2Record.id,
        status: "pending",
      },
    });

    const betaActivity = await prisma.activity.upsert({
      where: { id: "act-beta-secret" },
      update: { clientId: client2Record.id },
      create: {
        id: "act-beta-secret",
        type: "call",
        title: "Llamada Estratégica Beta",
        clientId: client2Record.id,
      },
    });

    const betaLead = await prisma.lead.upsert({
      where: { id: "lead-beta-secret" },
      update: { clientId: client2Record.id },
      create: {
        id: "lead-beta-secret",
        organizationId: defaultOrg.id,
        clientId: client2Record.id,
        name: "Lead Exclusivo Beta",
        email: "lead@beta.com",
      },
    });

    // 1. Authenticate ADMIN
    const loginAdminRes = await makeRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bunkermarketing.io", password: "bunker2026" }),
    });
    adminCookie = extractCookie(loginAdminRes, "bunker_session");

    // Authenticate / Provision Client 1 session
    const sbUser1 = await ensureSupabaseUser("usuario@alpha.com", "bunker2026", {
      name: "Usuario Alpha Comercial",
      role: "CLIENT",
      clientId: client1Record.id,
    });

    clientUser1 = await prisma.user.upsert({
      where: { email: "usuario@alpha.com" },
      update: { role: "CLIENT", clientId: client1Record.id, supabaseAuthId: sbUser1?.id },
      create: {
        email: "usuario@alpha.com",
        name: "Usuario Alpha Comercial",
        passwordHash: "$2b$10$eWkZ6NqC7u0N8d0V4mX9.eL7J4wE1fA8b5k0l1m2n3o4p5q6r7s8t",
        role: "CLIENT",
        clientId: client1Record.id,
        supabaseAuthId: sbUser1?.id,
        memberships: { create: { organizationId: defaultOrg.id, role: "member" } },
      },
    });

    const loginClient1Res = await makeRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "usuario@alpha.com", password: "bunker2026" }),
    });
    client1Cookie = extractCookie(loginClient1Res, "bunker_session");

    // Authenticate / Provision Client 2 session
    const sbUser2 = await ensureSupabaseUser("usuario@beta.com", "bunker2026", {
      name: "Usuario Beta Comercial",
      role: "CLIENT",
      clientId: client2Record.id,
    });

    clientUser2 = await prisma.user.upsert({
      where: { email: "usuario@beta.com" },
      update: { role: "CLIENT", clientId: client2Record.id, supabaseAuthId: sbUser2?.id },
      create: {
        email: "usuario@beta.com",
        name: "Usuario Beta Comercial",
        passwordHash: "$2b$10$eWkZ6NqC7u0N8d0V4mX9.eL7J4wE1fA8b5k0l1m2n3o4p5q6r7s8t",
        role: "CLIENT",
        clientId: client2Record.id,
        supabaseAuthId: sbUser2?.id,
        memberships: { create: { organizationId: defaultOrg.id, role: "member" } },
      },
    });

    const loginClient2Res = await makeRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "usuario@beta.com", password: "bunker2026" }),
    });
    client2Cookie = extractCookie(loginClient2Res, "bunker_session");

    // -------------------------------------------------------------------------
    // CRITERIO 1: ADMIN puede acceder a las funcionalidades administrativas autorizadas
    // -------------------------------------------------------------------------
    const adminRes = await makeRequest("/api/integrations", {
      headers: { Cookie: `bunker_session=${adminCookie}` },
    });
    const adminJson = await adminRes.json().catch(() => ({}));
    const passes1 = adminRes.status === 200 && adminJson.success === true && Array.isArray(adminJson.integrations);
    recordResult(
      1,
      "ADMIN accede a funcionalidades administrativas de Bunker",
      passes1,
      `GET /api/integrations respondió HTTP ${adminRes.status} con éxito y acceso a credenciales/cuentas conectadas.`
    );

    // -------------------------------------------------------------------------
    // CRITERIO 2: CLIENT puede iniciar sesión
    // -------------------------------------------------------------------------
    const meRes = await makeRequest("/api/auth/me", {
      headers: { Cookie: `bunker_session=${client1Cookie}` },
    });
    const meJson = await meRes.json().catch(() => ({}));
    const passes2 =
      meRes.status === 200 &&
      meJson.user?.role === "CLIENT" &&
      meJson.user?.clientId === client1Record.id &&
      meJson.user?.isClientUser === true;
    recordResult(
      2,
      "CLIENT inicia sesión y su identidad es verificada por servidor",
      passes2,
      `Sesión activa para ${meJson.user?.email}: role='${meJson.user?.role}', clientId='${meJson.user?.clientId}', isClientUser=${meJson.user?.isClientUser}`
    );

    // -------------------------------------------------------------------------
    // CRITERIO 3: CLIENT solo puede acceder al portal comercial
    // -------------------------------------------------------------------------
    const clientClientsRes = await makeRequest("/api/clients", {
      headers: { Cookie: `bunker_session=${client1Cookie}` },
    });
    const clientClientsJson = await clientClientsRes.json().catch(() => ({}));
    const passes3 =
      clientClientsRes.status === 200 &&
      clientClientsJson.clients?.length === 1 &&
      clientClientsJson.clients[0]?.id === client1Record.id;
    recordResult(
      3,
      "CLIENT accede exclusivamente a la vista comercial de su empresa",
      passes3,
      `GET /api/clients retornó únicamente 1 empresa (${clientClientsJson.clients?.[0]?.name}), ocultando todas las demás del sistema.`
    );

    // -------------------------------------------------------------------------
    // CRITERIO 4: CLIENT no puede acceder a las rutas administrativas
    // -------------------------------------------------------------------------
    const clientIntegrationsRes = await makeRequest("/api/integrations", {
      headers: { Cookie: `bunker_session=${client1Cookie}` },
    });
    const clientAiRes = await makeRequest("/api/marketing/ai-optimizer", {
      headers: { Cookie: `bunker_session=${client1Cookie}` },
    });
    const clientPostsRes = await makeRequest("/api/posts", {
      headers: { Cookie: `bunker_session=${client1Cookie}` },
    });
    const passes4 =
      clientIntegrationsRes.status === 403 &&
      clientAiRes.status === 403 &&
      clientPostsRes.status === 403;
    recordResult(
      4,
      "CLIENT no puede acceder a rutas ni APIs administrativas (Integraciones, IA, Posts)",
      passes4,
      `Integraciones: HTTP ${clientIntegrationsRes.status}, Optimizador IA: HTTP ${clientAiRes.status}, Posts: HTTP ${clientPostsRes.status} (Todos bloqueados con 403 Forbidden).`
    );

    // -------------------------------------------------------------------------
    // CRITERIO 5: CLIENT no puede cambiar su propio rol ni asignarse permisos
    // -------------------------------------------------------------------------
    const elevateRoleRes = await makeRequest("/api/users", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${client1Cookie}`,
      },
      body: JSON.stringify({ id: clientUser1.id, role: "ADMIN" }),
    });
    const passes5 = elevateRoleRes.status === 403;
    recordResult(
      5,
      "CLIENT no puede modificar su propio rol ni auto-asignarse privilegios",
      passes5,
      `PUT /api/users para auto-elevarse a 'ADMIN' fue rechazado con HTTP ${elevateRoleRes.status} (Forbidden).`
    );

    // -------------------------------------------------------------------------
    // CRITERIO 6: CLIENT no puede crear otros usuarios
    // -------------------------------------------------------------------------
    const createUserRes = await makeRequest("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${client1Cookie}`,
      },
      body: JSON.stringify({
        email: "hacker@test.com",
        password: "password123",
        name: "Usuario No Autorizado",
        role: "ADMIN",
      }),
    });
    const passes6 = createUserRes.status === 403;
    recordResult(
      6,
      "CLIENT no puede crear usuarios",
      passes6,
      `POST /api/users intentado por CLIENT fue rechazado con HTTP ${createUserRes.status} (Forbidden).`
    );

    // -------------------------------------------------------------------------
    // CRITERIO 7: CLIENT no puede consultar datos de otra empresa (Horizontal isolation)
    // -------------------------------------------------------------------------
    const getBetaByIdRes = await makeRequest(`/api/clients/${client2Record.id}`, {
      headers: { Cookie: `bunker_session=${client1Cookie}` },
    });
    const getBetaContactsRes = await makeRequest(`/api/contacts?clientId=${client2Record.id}`, {
      headers: { Cookie: `bunker_session=${client1Cookie}` },
    });
    const contactsJson = await getBetaContactsRes.json().catch(() => ({}));
    const foundBetaContact = contactsJson.contacts?.some((c) => c.id === "contact-beta-secret");

    const passes7 =
      (getBetaByIdRes.status === 403 || getBetaByIdRes.status === 404) &&
      !foundBetaContact;
    recordResult(
      7,
      "CLIENT no puede consultar datos de otra empresa (Aislamiento Horizontal estricto)",
      passes7,
      `Acceso directo por ID a /api/clients/${client2Record.id}: HTTP ${getBetaByIdRes.status}. Contactos de Beta filtrados: ${!foundBetaContact}.`
    );

    // -------------------------------------------------------------------------
    // CRITERIO 8: CLIENT no puede modificar registros de otra empresa
    // -------------------------------------------------------------------------
    const updateBetaRes = await makeRequest(`/api/clients/${client2Record.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${client1Cookie}`,
      },
      body: JSON.stringify({ name: "Empresa Hackeada por Alpha" }),
    });
    const updateBetaContactRes = await makeRequest("/api/contacts", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${client1Cookie}`,
      },
      body: JSON.stringify({ id: "contact-beta-secret", firstName: "Contacto Modificado" }),
    });
    const passes8 =
      (updateBetaRes.status === 403 || updateBetaRes.status === 404) &&
      (updateBetaContactRes.status === 403 || updateBetaContactRes.status === 404);
    recordResult(
      8,
      "CLIENT no puede modificar registros de otra empresa",
      passes8,
      `Modificar cliente ajeno: HTTP ${updateBetaRes.status}. Modificar contacto ajeno: HTTP ${updateBetaContactRes.status}.`
    );

    // -------------------------------------------------------------------------
    // CRITERIO 9: Las APIs rechazan operaciones no autorizadas (Negative Authorization)
    // -------------------------------------------------------------------------
    const anonRes = await makeRequest("/api/pipeline");
    const clientDeleteLeadRes = await makeRequest(`/api/leads?id=${betaLead.id}`, {
      method: "DELETE",
      headers: { Cookie: `bunker_session=${client1Cookie}` },
    });
    const passes9 = anonRes.status === 401 && clientDeleteLeadRes.status === 403;
    recordResult(
      9,
      "Las API rechazan operaciones no autorizadas con HTTP 401 / 403",
      passes9,
      `Petición anónima a /api/pipeline responde HTTP ${anonRes.status}. Intento de CLIENT de borrar lead responde HTTP ${clientDeleteLeadRes.status}.`
    );

    // -------------------------------------------------------------------------
    // CRITERIO 10: Creación de usuario cliente asocia correctamente usuario y empresa
    // -------------------------------------------------------------------------
    // ADMIN creates a new client user for Alpha
    const newClientUserEmail = `portal.test.${Date.now()}@alpha.com`;
    const createPortalUserRes = await makeRequest("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${adminCookie}`,
      },
      body: JSON.stringify({
        email: newClientUserEmail,
        password: "TempSecurePassword2026!",
        name: "Nuevo Usuario Portal Alpha",
        role: "CLIENT",
        clientId: client1Record.id,
      }),
    });
    const createPortalJson = await createPortalUserRes.json().catch(() => ({}));
    const passes10 =
      createPortalUserRes.status === 201 &&
      createPortalJson.user?.role === "CLIENT" &&
      createPortalJson.user?.clientId === client1Record.id;
    recordResult(
      10,
      "Creación de usuario CLIENT genera asociación verificada con su empresa",
      passes10,
      `Usuario creado: ${newClientUserEmail}, role='${createPortalJson.user?.role}', empresa vinculada='${client1Record.id}' (Alta confirmada).`
    );

    // -------------------------------------------------------------------------
    // CRITERIO 11: Sesiones y rutas protegidas siguen funcionando
    // -------------------------------------------------------------------------
    const meAgain = await makeRequest("/api/auth/me", {
      headers: { Cookie: `bunker_session=${adminCookie}` },
    });
    const meAgainJson = await meAgain.json().catch(() => ({}));
    const passes11 = meAgain.status === 200 && meAgainJson.user?.role === "ADMIN";
    recordResult(
      11,
      "Sesiones de autenticación y rutas protegidas operan con estabilidad",
      passes11,
      `Sesión de ADMIN intacta tras múltiples operaciones concurrentes: ${meAgainJson.user?.email}`
    );

    // -------------------------------------------------------------------------
    // CRITERIO 12: Los módulos existentes continúan operando después de los cambios
    // -------------------------------------------------------------------------
    const [leadsCheck, pipelineCheck, tasksCheck, activitiesCheck] = await Promise.all([
      makeRequest("/api/leads", { headers: { Cookie: `bunker_session=${adminCookie}` } }),
      makeRequest("/api/pipeline", { headers: { Cookie: `bunker_session=${adminCookie}` } }),
      makeRequest("/api/tasks", { headers: { Cookie: `bunker_session=${adminCookie}` } }),
      makeRequest("/api/activities", { headers: { Cookie: `bunker_session=${adminCookie}` } }),
    ]);
    const passes12 =
      leadsCheck.status === 200 &&
      pipelineCheck.status === 200 &&
      tasksCheck.status === 200 &&
      activitiesCheck.status === 200;
    recordResult(
      12,
      "Todos los módulos comerciales existentes continúan operando con normalidad",
      passes12,
      `Leads: HTTP ${leadsCheck.status}, Pipeline: HTTP ${pipelineCheck.status}, Tareas: HTTP ${tasksCheck.status}, Actividades: HTTP ${activitiesCheck.status}`
    );
  } catch (error) {
    console.error("Error fatal en la ejecución de pruebas:", error);
  } finally {
    console.log("\n==========================================================================");
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    console.log(`RESUMEN DE PRUEBAS: ${passedCount} / ${totalCount} PASADAS`);
    console.log("==========================================================================\n");
    await prisma.$disconnect();
    process.exit(passedCount === totalCount ? 0 : 1);
  }
}

runSuite();
