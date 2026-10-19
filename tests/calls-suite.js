// tests/calls-suite.js
// Llamadas: solo Twilio (firma válida) controla las llamadas, un asesor solo llama a leads de
// su empresa, solo Bunker puede escuchar en vivo, y las líneas son solo de admin.
// Uso: TEST_BASE_URL=http://127.0.0.1:3005 node tests/calls-suite.js
// Requiere la migración 20261016200000_voice_calls aplicada y un servidor corriendo con el
// mismo TWILIO_AUTH_TOKEN y NEXT_PUBLIC_APP_URL que este .env.
// No hace llamadas reales: ningún caso llega a marcarle a un número (se cortan antes por
// permisos, o son webhooks simulados que solo devuelven TwiML).

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
const LINE_NUMBER = `+5233${DIGITS}`;
const CALLER_NUMBER = `+5281${DIGITS}`;

const VOICE = "/api/integrations/twilio/voice";
const INBOUND = "/api/integrations/twilio/voice/inbound";
const STATUS = "/api/integrations/twilio/voice/status";
const ANNOUNCE = "/api/integrations/twilio/voice/announce";

const results = [];
function record(id, pass, msg) {
  results.push({ id, pass, msg });
  console.log(`${pass ? "PASS" : "FAIL"} [${id}] ${msg}`);
}

const req = (p, opts = {}) => fetch(`${BASE_URL}${p}`, { redirect: "manual", ...opts });
const auth = (cookie) => ({ "Content-Type": "application/json", Cookie: `bunker_session=${cookie}` });
const json = async (res) => res.json().catch(() => ({}));

function sign(pathWithQuery, params, token = AUTH_TOKEN) {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], `${APP_URL}${pathWithQuery}`);
  return crypto.createHmac("sha1", token).update(payload).digest("base64");
}

async function twilio(pathWithQuery, params, signed = true) {
  const res = await req(pathWithQuery, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(signed ? { "X-Twilio-Signature": sign(pathWithQuery, params) } : {}),
    },
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

async function provisionClientUser(org, client, email) {
  const { data } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: `Asesor ${client.name}`, role: "CLIENT", clientId: client.id },
  });
  return prisma.user.create({
    data: {
      email,
      name: `Asesor ${client.name}`,
      passwordHash: "supabase-managed",
      role: "CLIENT",
      clientId: client.id,
      supabaseAuthId: data?.user?.id,
      memberships: { create: { organizationId: org.id, role: "member" } },
    },
  });
}

async function run() {
  console.log("\n=== BUNKER CRM — SUITE: LLAMADAS Y LÍNEAS ===\n");
  if (!AUTH_TOKEN || !APP_URL) {
    console.error("Faltan TWILIO_AUTH_TOKEN o NEXT_PUBLIC_APP_URL en .env");
    process.exit(1);
  }
  const created = { clients: [], leads: [], calls: [], lines: [], orgs: [] };

  try {
    const org = await prisma.organization.findFirst({ where: { slug: "bunker-agency" } });
    if (!org) throw new Error("Organización bunker-agency no encontrada");
    const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (!admin) throw new Error(`Usuario admin ${ADMIN_EMAIL} no encontrado`);

    const alpha = await prisma.client.create({ data: { organizationId: org.id, name: `Alpha Voz ${STAMP}`, status: "active" } });
    const beta = await prisma.client.create({ data: { organizationId: org.id, name: `Beta Voz ${STAMP}`, status: "active" } });
    created.clients.push(alpha.id, beta.id);
    const alphaLead = await prisma.lead.create({
      data: { organizationId: org.id, clientId: alpha.id, name: `Lead Voz ${STAMP}`, normalizedPhone: `+5255${DIGITS}`, phone: `+5255${DIGITS}`, source: "meta_ads" },
    });
    const alphaLeadNoPhone = await prisma.lead.create({
      data: { organizationId: org.id, clientId: alpha.id, name: `Lead sin tel ${STAMP}`, source: "meta_ads" },
    });
    created.leads.push(alphaLead.id, alphaLeadNoPhone.id);

    const alphaUser = await provisionClientUser(org, alpha, `alpha.voz.${STAMP}@test.bunker`);
    const betaUser = await provisionClientUser(org, beta, `beta.voz.${STAMP}@test.bunker`);
    const alphaCookie = await login(`alpha.voz.${STAMP}@test.bunker`, PASSWORD);
    const betaCookie = await login(`beta.voz.${STAMP}@test.bunker`, PASSWORD);
    const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!alphaCookie || !betaCookie || !adminCookie) throw new Error("No se pudo iniciar sesión");

    // 1. Token del navegador
    let res = await req("/api/voice/token");
    record("CALL-01", res.status === 401, `Token sin sesión → HTTP ${res.status} (esperado 401)`);
    res = await req("/api/voice/token", { headers: auth(alphaCookie) });
    let body = await json(res);
    record(
      "CALL-02",
      (res.status === 200 && body.identity === `u_${alphaUser.id}`) || res.status === 503,
      res.status === 503 ? "Token → 503 (voz sin configurar en este entorno; correcto)" : `Token → identidad ${body.identity}`
    );

    // 2. Un asesor solo llama a leads de su empresa, y el lead debe tener teléfono
    res = await req("/api/voice/calls", { method: "POST", headers: auth(betaCookie), body: JSON.stringify({ leadId: alphaLead.id }) });
    record("CALL-03", res.status === 404, `Beta llama al lead de Alpha → HTTP ${res.status} (esperado 404)`);
    res = await req("/api/voice/calls", { method: "POST", headers: auth(alphaCookie), body: JSON.stringify({ leadId: alphaLeadNoPhone.id }) });
    record("CALL-04", res.status === 400, `Lead sin teléfono → HTTP ${res.status} (esperado 400)`);

    // 3. Webhooks sin firma
    const unsigned = await Promise.all([VOICE, INBOUND, `${STATUS}?callId=x&leg=customer`, ANNOUNCE].map((p) => twilio(p, { CallSid: "CA1" }, false)));
    record("CALL-05", unsigned.every((r) => r.status === 403), `Webhooks de voz sin firma → ${unsigned.map((r) => r.status).join(", ")} (esperado 403)`);

    // Llamada saliente del admin, simulada como "en curso" (sin Twilio)
    const liveCall = await prisma.call.create({
      data: {
        organizationId: org.id,
        clientId: alpha.id,
        leadId: alphaLead.id,
        userId: admin.id,
        direction: "outbound",
        fromNumber: LINE_NUMBER,
        // Número imposible a propósito: si un control fallara, Twilio rechaza la llamada.
        toNumber: "+0",
        status: "in_progress",
        conferenceName: `call_test_${STAMP}`,
        agentCallSid: `CAagent${STAMP}`,
        answeredAt: new Date(),
      },
    });
    created.calls.push(liveCall.id);

    // 4. Un callId ajeno no conecta (y no se le marca a nadie)
    let r = await twilio(VOICE, { CallSid: `CAx${STAMP}`, Caller: `client:u_${betaUser.id}`, callId: liveCall.id });
    record("CALL-06", r.status === 200 && r.text.includes("<Say") && !r.text.includes("<Conference"), "callId de otro usuario → mensaje de error, sin conferencia");

    // 5. Un CLIENT no puede escuchar; un admin sí (y queda en AuditLog)
    r = await twilio(VOICE, { CallSid: `CAs${STAMP}`, Caller: `client:u_${alphaUser.id}`, monitorCallId: liveCall.id, mode: "listen" });
    record("CALL-07", r.text.includes("<Say") && !r.text.includes("<Conference"), "CLIENT intenta escuchar → rechazado");

    r = await twilio(VOICE, { CallSid: `CAs${STAMP}`, Caller: `client:u_${admin.id}`, monitorCallId: liveCall.id, mode: "listen" });
    const audit = await prisma.auditLog.findFirst({ where: { action: "call_monitored", entityId: liveCall.id, userId: admin.id } });
    record(
      "CALL-08",
      r.text.includes(`muted="true"`) && r.text.includes(liveCall.conferenceName) && r.text.includes(`endConferenceOnExit="false"`) && Boolean(audit),
      "Admin escucha → conferencia muteada, no termina la llamada al salir, con AuditLog"
    );

    r = await twilio(VOICE, { CallSid: `CAw${STAMP}`, Caller: `client:u_${admin.id}`, monitorCallId: liveCall.id, mode: "whisper" });
    record("CALL-09", r.text.includes(`coach="CAagent${STAMP}"`), "Admin susurra → coach a la pierna del asesor");

    // 6. Fin de la llamada: estado, duración y una sola Activity aunque Twilio repita el callback
    const done = { CallSid: `CAcust${STAMP}`, CallStatus: "completed", CallDuration: "42" };
    await twilio(`${STATUS}?callId=${liveCall.id}&leg=customer`, done);
    await twilio(`${STATUS}?callId=${liveCall.id}&leg=customer`, done);
    const finished = await prisma.call.findUnique({ where: { id: liveCall.id } });
    const activities = await prisma.activity.count({ where: { leadId: alphaLead.id, type: "call" } });
    record(
      "CALL-10",
      finished.status === "completed" && finished.durationSec === 42 && activities === 1,
      `Callback "completed" ×2 → ${finished.status}, ${finished.durationSec}s, ${activities} actividad(es) en el lead`
    );

    // 7. Entrantes
    r = await twilio(INBOUND, { CallSid: `CAin0${STAMP}`, From: CALLER_NUMBER, To: `+5299${DIGITS}` });
    const orphan = await prisma.call.count({ where: { customerCallSid: `CAin0${STAMP}` } });
    record("CALL-11", r.text.includes("<Say") && orphan === 0, "Entrante a un número no registrado → mensaje de cortesía, sin registro");

    const line = await prisma.phoneLine.create({ data: { organizationId: org.id, clientId: alpha.id, phoneNumber: LINE_NUMBER, label: `Línea ${STAMP}` } });
    created.lines.push(line.id);
    r = await twilio(INBOUND, { CallSid: `CAin1${STAMP}`, From: CALLER_NUMBER, To: LINE_NUMBER });
    const inboundCall = await prisma.call.findFirst({ where: { customerCallSid: `CAin1${STAMP}` } });
    if (inboundCall) created.calls.push(inboundCall.id);
    record(
      "CALL-12",
      r.text.includes(`<Identity>u_${alphaUser.id}</Identity>`) && !r.text.includes(`u_${betaUser.id}`) && inboundCall?.status === "ringing",
      "Entrante a la línea de Alpha → timbra solo en asesores de Alpha"
    );

    r = await twilio(`${STATUS}?callId=${inboundCall?.id}&leg=dial`, { CallSid: `CAin1${STAMP}`, DialCallStatus: "no-answer" });
    const missed = inboundCall ? await prisma.call.findUnique({ where: { id: inboundCall.id } }) : null;
    record("CALL-13", r.text.includes("<Say") && missed?.status === "no_answer", `Nadie contesta → buzón de cortesía y estado ${missed?.status}`);

    // 8. Historial por cliente
    const callIds = async (cookie) => (((await json(await req("/api/voice/calls", { headers: auth(cookie) }))).calls) || []).map((c) => c.id);
    const betaCalls = await callIds(betaCookie);
    const alphaCalls = await callIds(alphaCookie);
    record("CALL-14", alphaCalls.includes(liveCall.id) && !betaCalls.includes(liveCall.id), "Alpha ve sus llamadas; Beta no");

    // 9. Líneas: solo admin, número válido y único, y de su organización
    res = await req("/api/voice/lines", { headers: auth(alphaCookie) });
    record("CALL-15", res.status === 403, `CLIENT en /api/voice/lines → HTTP ${res.status} (esperado 403)`);
    res = await req("/api/voice/lines", { method: "POST", headers: auth(adminCookie), body: JSON.stringify({ phoneNumber: "123", label: "Mal" }) });
    record("CALL-16", res.status === 400, `Línea con número inválido → HTTP ${res.status} (esperado 400)`);
    res = await req("/api/voice/lines", { method: "POST", headers: auth(adminCookie), body: JSON.stringify({ phoneNumber: LINE_NUMBER, label: "Duplicada" }) });
    record("CALL-17", res.status === 409, `Línea con número ya registrado → HTTP ${res.status} (esperado 409)`);

    const otherOrg = await prisma.organization.create({ data: { name: `Otra voz ${STAMP}`, slug: `otra-voz-${STAMP}` } });
    created.orgs.push(otherOrg.id);
    const foreignLine = await prisma.phoneLine.create({ data: { organizationId: otherOrg.id, phoneNumber: `+5244${DIGITS}`, label: "Ajena" } });
    res = await req(`/api/voice/lines/${foreignLine.id}`, { method: "PATCH", headers: auth(adminCookie), body: JSON.stringify({ isActive: false }) });
    record("CALL-18", res.status === 404, `Editar línea de otra organización → HTTP ${res.status} (esperado 404)`);
  } catch (err) {
    console.error("Error fatal:", err);
    record("FATAL", false, err.message);
  } finally {
    if (created.calls.length) await prisma.call.deleteMany({ where: { id: { in: created.calls } } });
    await prisma.call.deleteMany({ where: { fromNumber: CALLER_NUMBER } });
    if (created.lines.length) await prisma.phoneLine.deleteMany({ where: { id: { in: created.lines } } });
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
    // La organización de prueba se lleva por cascada su línea.
    if (created.orgs.length) await prisma.organization.deleteMany({ where: { id: { in: created.orgs } } });

    const passed = results.filter((r) => r.pass).length;
    console.log(`\nRESUMEN: ${passed} / ${results.length} PASADAS\n`);
    await prisma.$disconnect();
    process.exit(passed === results.length ? 0 : 1);
  }
}

run();
