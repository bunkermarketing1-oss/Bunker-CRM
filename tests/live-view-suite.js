// tests/live-view-suite.js
// Vista en vivo del equipo y rol dueño (CLIENT_OWNER): el dueño de A ve y escucha solo a A, un
// asesor no entra a la vista ni escucha, Bunker ve todo, y solo Bunker asigna el rol de dueño.
// Uso: TEST_BASE_URL=http://127.0.0.1:3005 node tests/live-view-suite.js
// Requiere un servidor corriendo con el mismo TWILIO_AUTH_TOKEN y NEXT_PUBLIC_APP_URL que este .env.
// Crea y borra sus propios datos (clientes, usuarios, leads y llamadas simuladas). No hace
// llamadas reales: las llamadas "en curso" se insertan en la base y la escucha se prueba con
// el webhook firmado del TwiML App, que solo devuelve TwiML.

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

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
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3005";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const ADMIN_EMAIL = process.env.AUDIT_EMAIL || "admin@bunkermarketing.io";
const ADMIN_PASSWORD = process.env.AUDIT_PASSWORD || "bunker2026";
const PASSWORD = "bunker2026";
const STAMP = Date.now();
const DIGITS = String(STAMP).slice(-8);
const VOICE = "/api/integrations/twilio/voice";
const LIVE = "/api/team/live";

const results = [];
function record(id, pass, msg) {
  results.push({ id, pass, msg });
  console.log(`${pass ? "PASS" : "FAIL"} [${id}] ${msg}`);
}

const req = (p, opts = {}) => fetch(`${BASE_URL}${p}`, { redirect: "manual", ...opts });
const auth = (cookie) => ({ "Content-Type": "application/json", Cookie: `bunker_session=${cookie}` });
const json = async (res) => res.json().catch(() => ({}));
const emailFor = (name) => `${name}.${STAMP}@test.bunker`;

function sign(pathWithQuery, params) {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], `${APP_URL}${pathWithQuery}`);
  return crypto.createHmac("sha1", AUTH_TOKEN).update(payload).digest("base64");
}

async function twilio(pathWithQuery, params) {
  const res = await req(pathWithQuery, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": sign(pathWithQuery, params) },
    body: new URLSearchParams(params).toString(),
  });
  return { status: res.status, text: await res.text() };
}

async function login(email, password) {
  const res = await req("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const m = (res.headers.get("set-cookie") || "").match(/bunker_session=([^;]*)/);
  return m ? m[1] : null;
}

async function provisionPortalUser(org, client, email, role) {
  const { data } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: `${role} ${client.name}`, role, clientId: client.id },
  });
  return prisma.user.create({
    data: {
      email,
      name: `${role} ${client.name}`,
      passwordHash: "supabase-managed",
      role,
      clientId: client.id,
      supabaseAuthId: data?.user?.id,
      memberships: { create: { organizationId: org.id, role: "member" } },
    },
  });
}

// Llamada simulada "en curso": número imposible a propósito para que nada llegue a marcarse.
function liveCallData(org, client, lead, user, suffix) {
  return {
    organizationId: org.id,
    clientId: client.id,
    leadId: lead.id,
    userId: user.id,
    direction: "outbound",
    fromNumber: `+5233${DIGITS}`,
    toNumber: "+0",
    status: "in_progress",
    conferenceName: `call_live_${suffix}_${STAMP}`,
    agentCallSid: `CAagent${suffix}${STAMP}`,
    answeredAt: new Date(),
  };
}

async function run() {
  console.log("\n=== BUNKER CRM — SUITE: VISTA EN VIVO Y ROL DUEÑO ===\n");
  if (!AUTH_TOKEN || !APP_URL) {
    console.error("Faltan TWILIO_AUTH_TOKEN o NEXT_PUBLIC_APP_URL en .env");
    process.exit(1);
  }
  const created = { clients: [], leads: [], calls: [], orgs: [] };

  try {
    const org = await prisma.organization.findFirst({ where: { slug: "bunker-agency" } });
    if (!org) throw new Error("Organización bunker-agency no encontrada");

    const alpha = await prisma.client.create({ data: { organizationId: org.id, name: `Alpha Live ${STAMP}`, status: "active" } });
    const beta = await prisma.client.create({ data: { organizationId: org.id, name: `Beta Live ${STAMP}`, status: "active" } });
    created.clients.push(alpha.id, beta.id);
    const alphaLead = await prisma.lead.create({ data: { organizationId: org.id, clientId: alpha.id, name: `Lead Alpha ${STAMP}`, source: "manual" } });
    const betaLead = await prisma.lead.create({ data: { organizationId: org.id, clientId: beta.id, name: `Lead Beta ${STAMP}`, source: "manual" } });
    created.leads.push(alphaLead.id, betaLead.id);

    const alphaOwner = await provisionPortalUser(org, alpha, emailFor("alpha.owner"), "CLIENT_OWNER");
    const alphaAdvisor = await provisionPortalUser(org, alpha, emailFor("alpha.advisor"), "CLIENT");
    const betaAdvisor = await provisionPortalUser(org, beta, emailFor("beta.advisor"), "CLIENT");

    const ownerCookie = await login(emailFor("alpha.owner"), PASSWORD);
    const advisorCookie = await login(emailFor("alpha.advisor"), PASSWORD);
    const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!ownerCookie || !advisorCookie || !adminCookie) throw new Error("No se pudo iniciar sesión");

    const alphaCall = await prisma.call.create({ data: liveCallData(org, alpha, alphaLead, alphaAdvisor, "a") });
    const betaCall = await prisma.call.create({ data: liveCallData(org, beta, betaLead, betaAdvisor, "b") });
    created.calls.push(alphaCall.id, betaCall.id);

    // 1. Acceso a la vista
    let res = await req(LIVE);
    record("LIVE-01", res.status === 401, `Vista en vivo sin sesión → HTTP ${res.status} (esperado 401)`);
    res = await req(LIVE, { headers: auth(advisorCookie) });
    record("LIVE-02", res.status === 403, `Asesor (CLIENT) en la vista en vivo → HTTP ${res.status} (esperado 403)`);

    // 2. El dueño de Alpha solo ve a Alpha, aunque pida otro cliente
    const idsOf = (body) => (body.advisors || []).map((a) => a.userId);
    const callIdsOf = (body) => (body.liveCalls || []).map((c) => c.id);
    let body = await json(await req(LIVE, { headers: auth(ownerCookie) }));
    record(
      "LIVE-03",
      idsOf(body).includes(alphaAdvisor.id) && !idsOf(body).includes(betaAdvisor.id),
      "Dueño de Alpha ve a sus asesores y no a los de Beta"
    );
    record(
      "LIVE-04",
      callIdsOf(body).includes(alphaCall.id) && !callIdsOf(body).includes(betaCall.id),
      "Dueño de Alpha ve la llamada en vivo de Alpha y no la de Beta"
    );
    const alphaRow = (body.advisors || []).find((a) => a.userId === alphaAdvisor.id);
    record("LIVE-05", alphaRow?.status === "on_call" && alphaRow?.currentCall?.callId === alphaCall.id, `Asesor con llamada en curso → estado ${alphaRow?.status}`);
    body = await json(await req(`${LIVE}?clientId=${beta.id}`, { headers: auth(ownerCookie) }));
    record(
      "LIVE-06",
      !idsOf(body).includes(betaAdvisor.id) && !callIdsOf(body).includes(betaCall.id),
      "Dueño de Alpha pide ?clientId=Beta → se ignora, sigue viendo solo Alpha"
    );

    // 3. Bunker ve todo y puede filtrar
    body = await json(await req(LIVE, { headers: auth(adminCookie) }));
    record(
      "LIVE-07",
      [alphaAdvisor.id, betaAdvisor.id].every((id) => idsOf(body).includes(id)) &&
        [alphaCall.id, betaCall.id].every((id) => callIdsOf(body).includes(id)),
      "Admin ve asesores y llamadas en vivo de Alpha y Beta"
    );
    body = await json(await req(`${LIVE}?clientId=${alpha.id}`, { headers: auth(adminCookie) }));
    record("LIVE-08", idsOf(body).includes(alphaAdvisor.id) && !idsOf(body).includes(betaAdvisor.id), "Admin filtra por Alpha → solo Alpha");
    const otherOrg = await prisma.organization.create({ data: { name: `Otra live ${STAMP}`, slug: `otra-live-${STAMP}` } });
    created.orgs.push(otherOrg.id);
    const foreignClient = await prisma.client.create({ data: { organizationId: otherOrg.id, name: `Ajeno ${STAMP}`, status: "active" } });
    res = await req(`${LIVE}?clientId=${foreignClient.id}`, { headers: auth(adminCookie) });
    record("LIVE-09", res.status === 404, `Admin filtra por un cliente de otra organización → HTTP ${res.status} (esperado 404)`);

    // 4. Escucha: el dueño solo en su empresa; el asesor nunca
    let r = await twilio(VOICE, { CallSid: `CAo${STAMP}`, Caller: `client:u_${alphaOwner.id}`, monitorCallId: alphaCall.id, mode: "listen" });
    const audit = await prisma.auditLog.findFirst({ where: { action: "call_monitored", entityId: alphaCall.id, userId: alphaOwner.id } });
    record(
      "LIVE-10",
      r.text.includes(`muted="true"`) && r.text.includes(alphaCall.conferenceName) && Boolean(audit),
      "Dueño de Alpha escucha una llamada de Alpha → conferencia muteada, con AuditLog"
    );
    r = await twilio(VOICE, { CallSid: `CAw${STAMP}`, Caller: `client:u_${alphaOwner.id}`, monitorCallId: alphaCall.id, mode: "whisper" });
    record("LIVE-11", r.text.includes(`coach="${alphaCall.agentCallSid}"`), "Dueño de Alpha susurra → coach a la pierna del asesor");
    r = await twilio(VOICE, { CallSid: `CAx${STAMP}`, Caller: `client:u_${alphaOwner.id}`, monitorCallId: betaCall.id, mode: "listen" });
    record("LIVE-12", r.text.includes("<Say") && !r.text.includes("<Conference"), "Dueño de Alpha intenta escuchar una llamada de Beta → rechazado");
    r = await twilio(VOICE, { CallSid: `CAy${STAMP}`, Caller: `client:u_${alphaAdvisor.id}`, monitorCallId: alphaCall.id, mode: "listen" });
    record("LIVE-13", r.text.includes("<Say") && !r.text.includes("<Conference"), "Asesor intenta escuchar una llamada de su propia empresa → rechazado");

    // 5. /api/voice/calls: el dueño recibe las llamadas en vivo de su empresa; el asesor ninguna
    body = await json(await req("/api/voice/calls", { headers: auth(ownerCookie) }));
    record(
      "LIVE-14",
      callIdsOf(body).includes(alphaCall.id) && !callIdsOf(body).includes(betaCall.id),
      "Dueño en /api/voice/calls → liveCalls de Alpha, sin las de Beta"
    );
    body = await json(await req("/api/voice/calls", { headers: auth(advisorCookie) }));
    record("LIVE-15", Array.isArray(body.liveCalls) && body.liveCalls.length === 0, "Asesor en /api/voice/calls → liveCalls vacío");

    // 6. El dueño no gana permisos de Bunker
    res = await req("/api/voice/lines", { headers: auth(ownerCookie) });
    record("LIVE-16", res.status === 403, `Dueño en /api/voice/lines (solo admin) → HTTP ${res.status} (esperado 403)`);
    res = await req("/api/users", { method: "PUT", headers: auth(ownerCookie), body: JSON.stringify({ id: alphaAdvisor.id, role: "CLIENT_OWNER" }) });
    record("LIVE-17", res.status === 403, `Dueño intenta promover a un asesor → HTTP ${res.status} (esperado 403)`);

    // 7. Solo Bunker asigna el rol de dueño, con valores válidos y AuditLog
    res = await req("/api/users", { method: "PUT", headers: auth(adminCookie), body: JSON.stringify({ id: betaAdvisor.id, role: "CLIENT_OWNER" }) });
    body = await json(res);
    const roleAudit = await prisma.auditLog.findFirst({ where: { action: "user_role_changed", entityId: betaAdvisor.id } });
    record("LIVE-18", res.status === 200 && body.user?.role === "CLIENT_OWNER" && Boolean(roleAudit), `Admin hace dueño a un asesor → HTTP ${res.status}, rol ${body.user?.role}, AuditLog ${Boolean(roleAudit)}`);
    res = await req("/api/users", { method: "PUT", headers: auth(adminCookie), body: JSON.stringify({ id: betaAdvisor.id, role: "ADMIN" }) });
    record("LIVE-19", res.status === 400, `Admin intenta dar ADMIN a un usuario de empresa → HTTP ${res.status} (esperado 400)`);
    res = await req("/api/users", { method: "PUT", headers: auth(adminCookie), body: JSON.stringify({ id: betaAdvisor.id, role: "SUPERADMIN" }) });
    record("LIVE-20", res.status === 400, `Rol inexistente → HTTP ${res.status} (esperado 400)`);
  } catch (err) {
    console.error("Error fatal:", err);
    record("FATAL", false, err.message);
  } finally {
    if (created.calls.length) await prisma.call.deleteMany({ where: { id: { in: created.calls } } });
    if (created.leads.length) {
      await prisma.activity.deleteMany({ where: { leadId: { in: created.leads } } });
      await prisma.lead.deleteMany({ where: { id: { in: created.leads } } });
    }
    await prisma.user.deleteMany({ where: { email: { endsWith: `${STAMP}@test.bunker` } } });
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    for (const u of list?.users || []) {
      if (u.email?.endsWith(`${STAMP}@test.bunker`)) await supabaseAdmin.auth.admin.deleteUser(u.id);
    }
    if (created.clients.length) await prisma.client.deleteMany({ where: { id: { in: created.clients } } });
    // La organización de prueba se lleva por cascada su cliente.
    if (created.orgs.length) await prisma.organization.deleteMany({ where: { id: { in: created.orgs } } });

    const passed = results.filter((r) => r.pass).length;
    console.log(`\nRESUMEN: ${passed} / ${results.length} PASADAS\n`);
    await prisma.$disconnect();
    process.exit(passed === results.length ? 0 : 1);
  }
}

run();
