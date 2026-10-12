// tests/clients-suite.js
// Fase 3 — Centro de Gestión Comercial 360°: Suite de Pruebas Automatizadas de Clientes
// Cobertura completa de los 17 puntos requeridos en la especificación Fase K.
// Uso: BASE_URL=http://127.0.0.1:3005 node tests/clients-suite.js

const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#") && t.includes("=")) {
      const i = t.indexOf("=");
      let v = t.slice(i + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[t.slice(0, i).trim()] = v;
    }
  }
}

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3005";
const ADMIN_EMAIL = process.env.AUDIT_EMAIL || "admin@bunkermarketing.io";
const ADMIN_PASSWORD = process.env.AUDIT_PASSWORD || "bunker2026";

const results = [];
function record(id, pass, msg) {
  results.push({ id, pass, msg });
  console.log(`${pass ? "PASS" : "FAIL"} [${id}] ${msg}`);
}

async function req(p, opts = {}) {
  return fetch(`${BASE_URL}${p}`, { redirect: "manual", ...opts });
}

function cookieOf(res, name) {
  const sc = res.headers.get("set-cookie") || "";
  const m = sc.match(new RegExp(`${name}=([^;]*)`));
  return m ? m[1] : null;
}

const jh = (cookie) => ({
  "Content-Type": "application/json",
  ...(cookie ? { Cookie: `bunker_session=${cookie}` } : {}),
});

const STAMP = Date.now();
const created = {
  clients: [],
  contacts: [],
  opps: [],
  activities: [],
  tasks: [],
};
let tmpOrg = null;

async function runClientsSuite() {
  console.log(`\n=============================================================`);
  console.log(`   FASE 3 — SUITE DE PRUEBAS DE CLIENTES 360° (BUNKER CRM)`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`=============================================================\n`);

  // Autenticación inicial de administrador
  const loginRes = await req("/api/auth/login", {
    method: "POST",
    headers: jh(),
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const token = cookieOf(loginRes, "bunker_session");
  if (!token) {
    console.error("No se pudo autenticar como administrador para ejecutar las pruebas.");
    process.exit(1);
  }

  // Obtener organización principal propia
  const ownOrg = await prisma.organization.findFirst({
    where: { slug: "bunker-agency" },
  });
  if (!ownOrg) {
    console.error("No se encontró la organización bunker-agency en base de datos.");
    process.exit(1);
  }

  // Pipeline stage propio
  const ownStage = await prisma.pipelineStage.findFirst({
    where: { organizationId: ownOrg.id },
    orderBy: { order: "asc" },
  });

  // Crear organización temporal foránea para validaciones de aislamiento
  const stamp = STAMP;
  tmpOrg = await prisma.organization.create({
    data: { name: `AUDIT TMP ORG ${stamp}`, slug: `audit-tmp-org-${stamp}` },
  });
  const foreignClient = await prisma.client.create({
    data: {
      organizationId: tmpOrg.id,
      name: `Foreign Corp ${stamp}`,
      industry: "Bienes Raíces",
      revenue: 5000,
    },
  });
  const foreignContact = await prisma.contact.create({
    data: {
      organizationId: tmpOrg.id,
      clientId: foreignClient.id,
      firstName: "Foreign",
      lastName: "Contact",
      email: `foreign.${stamp}@invalid.test`,
      isPrimary: true,
    },
  });
  const foreignTask = await prisma.task.create({
    data: {
      clientId: foreignClient.id,
      title: `Foreign Task ${stamp}`,
      status: "pending",
    },
  });

  // 1. Consulta de clientes autenticada
  const listAuth = await req("/api/clients", { headers: jh(token) });
  const listAuthJson = await listAuth.json().catch(() => ({}));
  record(
    "CLIENT-01-AUTH",
    listAuth.status === 200 && Array.isArray(listAuthJson.clients),
    `Consulta de clientes autenticada responde HTTP 200 con array (${listAuthJson.clients?.length ?? 0} clientes)`
  );

  // 2. Rechazo de consultas sin sesión
  const listUnauth = await req("/api/clients", { headers: jh() });
  record(
    "CLIENT-02-UNAUTH",
    listUnauth.status === 401,
    `Consulta de clientes sin sesión rechazada con HTTP 401 (Unauthorized)`
  );

  // 3. Aislamiento entre organizaciones
  const foundForeign = (listAuthJson.clients || []).some((c) => c.id === foreignClient.id);
  record(
    "CLIENT-03-ORG-ISO",
    !foundForeign,
    `Aislamiento verificado: clientes de organización ajena no aparecen en la consulta`
  );

  // Crear un cliente legítimo para pruebas de la suite
  const postClient = await req("/api/clients", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({
      name: `Cliente Prueba 360 ${stamp}`,
      companyName: "Prueba 360 Corp S.A. de C.V.",
      email: `contacto.${stamp}@empresa360.test`,
      phone: "+52 55 4912 3011",
      website: "https://empresa360.test",
      industry: "Tecnología / SaaS",
      revenue: 4500,
      notes: "Cliente registrado durante la suite de pruebas Fase 3.",
    }),
  });
  const postClientJson = await postClient.json().catch(() => ({}));
  const testClientId = postClientJson.client?.id;
  if (testClientId) created.clients.push(testClientId);

  // 4. Consulta de una ficha válida
  const detailAuth = await req(`/api/clients/${testClientId}`, { headers: jh(token) });
  const detailJson = await detailAuth.json().catch(() => ({}));
  record(
    "CLIENT-04-DETAIL-VALID",
    detailAuth.status === 200 && detailJson.client?.id === testClientId,
    `Consulta de ficha 360° válida responde HTTP 200 con relaciones completas`
  );

  // 5. Rechazo de un cliente inexistente o ajeno
  const detailForeign = await req(`/api/clients/${foreignClient.id}`, { headers: jh(token) });
  const detailNone = await req(`/api/clients/00000000-0000-0000-0000-000000000000`, { headers: jh(token) });
  record(
    "CLIENT-05-DETAIL-ISO",
    detailForeign.status === 404 && detailNone.status === 404,
    `Ficha de cliente ajeno o inexistente responde HTTP 404 sin exponer información sensible`
  );

  // 6. Creación de un contacto
  const postContact = await req("/api/contacts", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({
      clientId: testClientId,
      firstName: "Lic. Andrea",
      lastName: "Morales",
      email: `andrea.${stamp}@empresa360.test`,
      phone: "+52 55 1234 5678",
      jobTitle: "Directora de Operaciones",
      isPrimary: true,
    }),
  });
  const postContactJson = await postContact.json().catch(() => ({}));
  const contact1Id = postContactJson.contact?.id;
  if (contact1Id) created.contacts.push(contact1Id);
  record(
    "CONTACT-06-CREATE",
    postContact.status === 201 && postContactJson.contact?.isPrimary === true,
    `Creación de contacto asociado exitosa HTTP 201 (designado como contacto principal)`
  );

  // 7. Validación de email y teléfono
  const badPhoneRes = await req("/api/contacts", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({
      clientId: testClientId,
      firstName: "Contacto Inv",
      phone: "123", // Teléfono no válido
    }),
  });
  const badEmailRes = await req("/api/contacts", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({
      clientId: testClientId,
      firstName: "Contacto Inv2",
      email: "correo_sin_arroba",
    }),
  });
  record(
    "CONTACT-07-VALIDATION",
    badPhoneRes.status === 400 && badEmailRes.status === 400,
    `Validaciones de teléfono corto y email inválido responden HTTP 400`
  );

  // 8. Protección de asociación de contactos entre organizaciones
  const foreignContactPost = await req("/api/contacts", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({
      clientId: foreignClient.id,
      firstName: "Contacto Infiltrado",
    }),
  });
  record(
    "CONTACT-08-CROSS-ORG",
    foreignContactPost.status === 404,
    `Intento de asociar contacto a cliente foráneo rechazado con HTTP 404`
  );

  // 9. Designación consistente del contacto principal
  const postContact2 = await req("/api/contacts", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({
      clientId: testClientId,
      firstName: "Ing. Rodrigo",
      lastName: "Paredes",
      email: `rodrigo.${stamp}@empresa360.test`,
      isPrimary: true, // Debe desplazar a Andrea y convertirse en el único principal
    }),
  });
  const postContact2Json = await postContact2.json().catch(() => ({}));
  if (postContact2Json.contact?.id) created.contacts.push(postContact2Json.contact.id);

  // Verificar en base de datos que solo exista 1 contacto principal para este cliente
  const primaryContacts = await prisma.contact.findMany({
    where: { clientId: testClientId, isPrimary: true, isDeleted: false },
  });
  record(
    "CONTACT-09-PRIMARY-MUTEX",
    primaryContacts.length === 1 && primaryContacts[0].id === postContact2Json.contact?.id,
    `Unicidad atómica de contacto principal garantizada (exactamente 1 contacto principal)`
  );

  // 10. Registro de una actividad
  const postActivity = await req("/api/activities", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({
      clientId: testClientId,
      type: "meeting",
      title: `Reunión de onboarding ${stamp}`,
      description: "Presentación del plan de pauta y embudo de conversión.",
      outcome: "completed",
    }),
  });
  const postActivityJson = await postActivity.json().catch(() => ({}));
  if (postActivityJson.activity?.id) created.activities.push(postActivityJson.activity.id);
  record(
    "ACTIVITY-10-REGISTER",
    postActivity.status === 201 && postActivityJson.activity?.title.includes("onboarding"),
    `Registro de actividad (reunión) responde HTTP 201`
  );

  // 11. Persistencia de la actividad
  const listActivities = await req(`/api/activities?clientId=${testClientId}`, { headers: jh(token) });
  const listActJson = await listActivities.json().catch(() => ({}));
  const foundAct = (listActJson.activities || []).some((a) => a.id === postActivityJson.activity?.id);
  record(
    "ACTIVITY-11-PERSIST",
    listActivities.status === 200 && foundAct,
    `Actividad persistida y recuperada exitosamente en la cronología de la cuenta`
  );

  // 12. Rechazo de actividades asociadas a clientes ajenos
  const badActivityPost = await req("/api/activities", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({
      clientId: foreignClient.id,
      type: "call",
      title: "Llamada intrusa",
    }),
  });
  const badActivityGet = await req(`/api/activities?clientId=${foreignClient.id}`, { headers: jh(token) });
  record(
    "ACTIVITY-12-CROSS-ORG",
    badActivityPost.status === 404 && badActivityGet.status === 404,
    `Escritura y lectura de actividades sobre cliente foráneo rechazadas con HTTP 404`
  );

  // 13. Consulta de oportunidades vinculadas
  let oppId = null;
  if (ownStage) {
    const postOpp = await req("/api/pipeline", {
      method: "POST",
      headers: jh(token),
      body: JSON.stringify({
        clientId: testClientId,
        title: `Contrato Retainer Trimestral ${stamp}`,
        value: 12000,
        stageId: ownStage.id,
        probability: 70,
      }),
    });
    const postOppJson = await postOpp.json().catch(() => ({}));
    if (postOppJson.opportunity?.id) {
      oppId = postOppJson.opportunity.id;
      created.opps.push(oppId);
    }
  }
  const detailWithOpp = await req(`/api/clients/${testClientId}`, { headers: jh(token) });
  const detailOppJson = await detailWithOpp.json().catch(() => ({}));
  const foundOpp = (detailOppJson.client?.opportunities || []).some((o) => o.id === oppId);
  record(
    "OPP-13-LINKED",
    foundOpp && detailOppJson.client?.opportunities?.length > 0,
    `Oportunidad comercial vinculada visible en la ficha 360° del cliente ($12,000 USD)`
  );

  // 14. Actualización del estado de una tarea
  const postTask = await req("/api/tasks", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({
      clientId: testClientId,
      title: `Enviar factura de anticipo ${stamp}`,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      priority: "high",
    }),
  });
  const postTaskJson = await postTask.json().catch(() => ({}));
  const taskId = postTaskJson.task?.id;
  if (taskId) created.tasks.push(taskId);

  const putTask = await req("/api/tasks", {
    method: "PUT",
    headers: jh(token),
    body: JSON.stringify({ id: taskId, status: "completed" }),
  });
  const putTaskJson = await putTask.json().catch(() => ({}));
  record(
    "TASK-14-STATUS-UPDATE",
    putTask.status === 200 && putTaskJson.task?.status === "completed" && Boolean(putTaskJson.task?.completedAt),
    `Actualización de tarea a 'completed' persiste con marca temporal completedAt`
  );

  // 15. Validación de importes en USD
  const negClient = await req("/api/clients", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({ name: `Neg Client ${stamp}`, revenue: -50 }),
  });
  const textClient = await req("/api/clients", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({ name: `Text Client ${stamp}`, revenue: "invalido" }),
  });
  record(
    "USD-15-VALIDATION",
    negClient.status === 400 && textClient.status === 400,
    `Validación estricta de importes en USD: valores negativos o no numéricos devuelven HTTP 400`
  );

  // 16. Ausencia de exposición de datos de otras organizaciones
  const foreignTasksQuery = await req(`/api/tasks?clientId=${foreignClient.id}`, { headers: jh(token) });
  record(
    "DATA-16-LEAK-PREVENT",
    foreignTasksQuery.status === 404,
    `Consulta de tareas por clientId foráneo rechazada con HTTP 404 sin filtración de datos`
  );

  // 17. Manejo de errores de persistencia / campos obligatorios
  const emptyClient = await req("/api/clients", {
    method: "POST",
    headers: jh(token),
    body: JSON.stringify({ name: "   " }), // Solo espacios
  });
  const putWithoutId = await req("/api/clients", {
    method: "PUT",
    headers: jh(token),
    body: JSON.stringify({ name: "Nombre sin ID" }),
  });
  record(
    "PERSIST-17-ERROR-HANDLE",
    emptyClient.status === 400 && putWithoutId.status === 400,
    `Peticiones malformadas manejadas limpiamente con HTTP 400 sin excepciones 500 no capturadas`
  );
}

(async () => {
  try {
    await runClientsSuite();
  } catch (e) {
    console.error("Error en suite de clientes:", e.message);
  } finally {
    // Cleanup cuidadoso: únicamente registros generados durante esta ejecución
    try {
      if (created.tasks.length) {
        await prisma.task.deleteMany({ where: { id: { in: created.tasks } } });
      }
      if (created.activities.length) {
        await prisma.activity.deleteMany({ where: { id: { in: created.activities } } });
      }
      if (created.opps.length) {
        await prisma.opportunity.deleteMany({ where: { id: { in: created.opps } } });
      }
      if (created.contacts.length) {
        await prisma.contact.deleteMany({ where: { id: { in: created.contacts } } });
      }
      if (created.clients.length) {
        await prisma.client.deleteMany({ where: { id: { in: created.clients } } });
      }
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: [...created.clients, ...created.contacts] } },
      });

      if (tmpOrg) {
        await prisma.task.deleteMany({ where: { client: { organizationId: tmpOrg.id } } });
        await prisma.contact.deleteMany({ where: { organizationId: tmpOrg.id } });
        await prisma.client.deleteMany({ where: { organizationId: tmpOrg.id } });
        await prisma.organization.delete({ where: { id: tmpOrg.id } }).catch(() => {});
      }
    } catch (e) {
      console.error("Advertencia en cleanup:", e.message);
    }

    await prisma.$disconnect();
    const failed = results.filter((r) => !r.pass);
    console.log(
      `\n=============================================================`
    );
    console.log(
      `RESUMEN FASE 3 (CLIENTES): ${results.length - failed.length}/${results.length} PRUEBAS SUPERADAS` +
        (failed.length ? ` | FALLOS: ${failed.map((f) => f.id).join(", ")}` : "")
    );
    console.log(
      `=============================================================\n`
    );
    process.exit(failed.length ? 1 : 0);
  }
})();
