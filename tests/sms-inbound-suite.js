// tests/sms-inbound-suite.js
// SMS entrantes, estados de entrega, bajas y envío masivo: solo Twilio (firma válida) puede
// registrar respuestas, una respuesta queda en el historial del lead correcto, "BAJA" detiene
// los envíos, y un cliente nunca ve los SMS de otro.
// Uso: TEST_BASE_URL=http://127.0.0.1:3005 node tests/sms-inbound-suite.js
// Requiere las migraciones 20261016180000_sms_inbound_optout y 20261019120000_sms_opt_out aplicadas y un servidor corriendo con
// el mismo TWILIO_AUTH_TOKEN y NEXT_PUBLIC_APP_URL que este .env.
// No envía SMS reales: los webhooks se llaman directo y el envío masivo real usa un filtro
// que no tiene destinatarios elegibles.

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
const LEAD_PHONE = `+5255${DIGITS}`;
const UNKNOWN_PHONE = `+5281${DIGITS}`;
const SMS_PATH = "/api/integrations/twilio/sms";
const STATUS_PATH = "/api/integrations/twilio/status";

const results = [];
function record(id, pass, msg) {
  results.push({ id, pass, msg });
  console.log(`${pass ? "PASS" : "FAIL"} [${id}] ${msg}`);
}

const req = (p, opts = {}) => fetch(`${BASE_URL}${p}`, { redirect: "manual", ...opts });
const auth = (cookie) => ({ "Content-Type": "application/json", Cookie: `bunker_session=${cookie}` });
const json = async (res) => res.json().catch(() => ({}));

function twilioSignature(webhookPath, params, token = AUTH_TOKEN) {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], `${APP_URL}${webhookPath}`);
  return crypto.createHmac("sha1", token).update(payload).digest("base64");
}

function postTwilio(webhookPath, params, signature) {
  return req(webhookPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(signature ? { "X-Twilio-Signature": signature } : {}),
    },
    body: new URLSearchParams(params).toString(),
  });
}

const inbound = (sid, from, body) => ({ MessageSid: sid, SmsSid: sid, From: from, To: "+15005550006", Body: body, NumMedia: "0" });

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
    user_metadata: { name: `Portal ${client.name}`, role: "CLIENT", clientId: client.id },
  });
  return prisma.user.create({
    data: {
      email,
      name: `Portal ${client.name}`,
      passwordHash: "supabase-managed",
      role: "CLIENT",
      clientId: client.id,
      supabaseAuthId: data?.user?.id,
      memberships: { create: { organizationId: org.id, role: "member" } },
    },
  });
}

async function run() {
  console.log("\n=== BUNKER CRM — SUITE: SMS ENTRANTES, ESTADOS Y MASIVO ===\n");
  if (!AUTH_TOKEN || !APP_URL) {
    console.error("Faltan TWILIO_AUTH_TOKEN o NEXT_PUBLIC_APP_URL en .env");
    process.exit(1);
  }

  const created = { clients: [], leads: [], orgs: [] };
  const outboundSid = `SMtest_out_${STAMP}`;

  try {
    const org = await prisma.organization.findFirst({ where: { slug: "bunker-agency" } });
    if (!org) throw new Error("Organización bunker-agency no encontrada");

    const alpha = await prisma.client.create({ data: { organizationId: org.id, name: `Alpha SMS ${STAMP}`, status: "active" } });
    const beta = await prisma.client.create({ data: { organizationId: org.id, name: `Beta SMS ${STAMP}`, status: "active" } });
    created.clients.push(alpha.id, beta.id);

    const lead = await prisma.lead.create({
      data: { organizationId: org.id, clientId: alpha.id, name: `Lead SMS ${STAMP}`, phone: LEAD_PHONE, normalizedPhone: LEAD_PHONE, source: "meta_ads" },
    });
    const leadWithoutPhone = await prisma.lead.create({
      data: { organizationId: org.id, clientId: alpha.id, name: `Lead sin tel ${STAMP}`, source: "meta_ads" },
    });
    created.leads.push(lead.id, leadWithoutPhone.id);

    // El SMS automático que se le mandó al lead (simulado, sin Twilio)
    const outbound = await prisma.message.create({
      data: {
        organizationId: org.id,
        clientId: alpha.id,
        leadId: lead.id,
        channel: "sms",
        direction: "outbound",
        recipient: LEAD_PHONE,
        body: "Hola, ¿te llamamos hoy?",
        status: "sent",
        providerMsgId: outboundSid,
      },
    });

    // 1. Sin firma, o con otro token, nadie puede inyectar respuestas
    const replyParams = inbound(`SMtest_in_${STAMP}`, LEAD_PHONE, "Sí, llámenme a las 5");
    let res = await postTwilio(SMS_PATH, replyParams, null);
    record("SMS-01", res.status === 403, `Entrante sin firma → HTTP ${res.status} (esperado 403)`);
    res = await postTwilio(SMS_PATH, replyParams, twilioSignature(SMS_PATH, replyParams, "otro-token"));
    record("SMS-02", res.status === 403, `Entrante con firma inválida → HTTP ${res.status} (esperado 403)`);

    // 2. La respuesta firmada queda en el historial del lead y del cliente correctos
    res = await postTwilio(SMS_PATH, replyParams, twilioSignature(SMS_PATH, replyParams));
    let text = await res.text();
    let inboundMsgs = await prisma.message.findMany({ where: { leadId: lead.id, direction: "inbound" } });
    record(
      "SMS-03",
      res.status === 200 && text.includes("<Response></Response>") && inboundMsgs.length === 1 && inboundMsgs[0].clientId === alpha.id,
      `Entrante firmado → HTTP ${res.status}, ${inboundMsgs.length} mensaje(s) en el lead, cliente correcto`
    );

    // 3. Twilio reintenta el mismo MessageSid: no se duplica
    await postTwilio(SMS_PATH, replyParams, twilioSignature(SMS_PATH, replyParams));
    inboundMsgs = await prisma.message.findMany({ where: { leadId: lead.id, direction: "inbound" } });
    record("SMS-04", inboundMsgs.length === 1, `Reintento del mismo MessageSid → ${inboundMsgs.length} mensaje(s) (esperado 1)`);

    // 4. Callback de entrega y orden de los estados
    const delivered = { MessageSid: outboundSid, SmsSid: outboundSid, MessageStatus: "delivered", SmsStatus: "delivered" };
    res = await postTwilio(STATUS_PATH, delivered, null);
    const statusNoSig = res.status;
    res = await postTwilio(STATUS_PATH, delivered, twilioSignature(STATUS_PATH, delivered));
    let out = await prisma.message.findUnique({ where: { id: outbound.id } });
    record(
      "SMS-05",
      statusNoSig === 403 && res.status === 200 && out.status === "delivered" && Boolean(out.deliveredAt),
      `Estado sin firma → ${statusNoSig}; "delivered" firmado → ${out.status}`
    );
    const lateSent = { MessageSid: outboundSid, SmsSid: outboundSid, MessageStatus: "sent", SmsStatus: "sent" };
    await postTwilio(STATUS_PATH, lateSent, twilioSignature(STATUS_PATH, lateSent));
    out = await prisma.message.findUnique({ where: { id: outbound.id } });
    record("SMS-06", out.status === "delivered", `Un "sent" tardío no retrocede el estado (queda ${out.status})`);

    // 5. "BAJA" da de baja el número y confirma en español
    const optOut = inbound(`SMtest_baja_${STAMP}`, LEAD_PHONE, "BAJA");
    res = await postTwilio(SMS_PATH, optOut, twilioSignature(SMS_PATH, optOut));
    text = await res.text();
    const optedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    record(
      "SMS-07",
      Boolean(optedLead.smsOptOutAt) && text.includes("<Message>"),
      `"BAJA" → smsOptOutAt ${optedLead.smsOptOutAt ? "registrado" : "vacío"}, confirmación TwiML ${text.includes("<Message>") ? "sí" : "no"}`
    );

    // 6. Un número desconocido no crea nada
    const stranger = inbound(`SMtest_unknown_${STAMP}`, UNKNOWN_PHONE, "Hola");
    res = await postTwilio(SMS_PATH, stranger, twilioSignature(SMS_PATH, stranger));
    const strangerMsgs = await prisma.message.count({ where: { recipient: UNKNOWN_PHONE } });
    record("SMS-08", res.status === 200 && strangerMsgs === 0, `Número desconocido → HTTP ${res.status}, ${strangerMsgs} mensaje(s) guardados`);

    // 7. Aislamiento: Beta no ve los SMS de Alpha, ni pidiéndolos por clientId
    await provisionClientUser(org, alpha, `alpha.sms.${STAMP}@test.bunker`);
    await provisionClientUser(org, beta, `beta.sms.${STAMP}@test.bunker`);
    const alphaCookie = await login(`alpha.sms.${STAMP}@test.bunker`, PASSWORD);
    const betaCookie = await login(`beta.sms.${STAMP}@test.bunker`, PASSWORD);
    const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!alphaCookie || !betaCookie || !adminCookie) throw new Error("No se pudo iniciar sesión");

    const smsIds = async (cookie, query = "") => {
      const r = await req(`/api/messages/sms${query}`, { headers: auth(cookie) });
      return ((await json(r)).messages || []).map((m) => m.id);
    };
    const alphaIds = await smsIds(alphaCookie);
    const betaIds = await smsIds(betaCookie, `?clientId=${alpha.id}`);
    record("SMS-09", alphaIds.includes(outbound.id), "Alpha ve los SMS de su lead");
    record("SMS-10", !betaIds.includes(outbound.id) && !betaIds.includes(inboundMsgs[0].id), "Beta no ve los SMS de Alpha aunque pida ?clientId de Alpha");

    // 8. El envío manual respeta la baja (no llega a Twilio). Solo se prueba si la baja quedó
    // registrada: si no, la petición mandaría un SMS real a un número inventado.
    if (optedLead.smsOptOutAt) {
      res = await req("/api/messages/sms", {
        method: "POST",
        headers: auth(adminCookie),
        body: JSON.stringify({ recipient: LEAD_PHONE, message: `Prueba ${STAMP}`, leadId: lead.id }),
      });
      record("SMS-11", res.status === 409, `SMS manual a un número dado de baja → HTTP ${res.status} (esperado 409)`);
    } else {
      record("SMS-11", false, "Omitido: la baja no quedó registrada (SMS-07) y el envío sería real");
    }

    // 8b. Un CLIENT solo escribe a leads de su empresa y al número guardado del lead.
    // Todos los números usados aquí están dados de baja: si el control fallara, la ruta
    // respondería 409 por la baja en vez de mandar un SMS real.
    if (optedLead.smsOptOutAt) {
      const blocker = await prisma.lead.create({
        data: { organizationId: org.id, clientId: beta.id, name: `Bloqueo ${STAMP}`, normalizedPhone: UNKNOWN_PHONE, smsOptOutAt: new Date(), source: "manual" },
      });
      created.leads.push(blocker.id);
      const otherOrg = await prisma.organization.create({ data: { name: `Otra SMS ${STAMP}`, slug: `otra-sms-${STAMP}` } });
      created.orgs.push(otherOrg.id);
      const foreignLead = await prisma.lead.create({
        data: { organizationId: otherOrg.id, name: `Ajeno ${STAMP}`, normalizedPhone: LEAD_PHONE, source: "manual" },
      });

      const sendAs = (cookie, payload) =>
        req("/api/messages/sms", { method: "POST", headers: auth(cookie), body: JSON.stringify({ message: `Prueba ${STAMP}`, ...payload }) });

      res = await sendAs(betaCookie, { leadId: lead.id, recipient: LEAD_PHONE });
      record("SMS-16", res.status === 403, `CLIENT Beta escribe al lead de Alpha → HTTP ${res.status} (esperado 403)`);

      res = await sendAs(betaCookie, { recipient: UNKNOWN_PHONE });
      record("SMS-17", res.status === 400, `CLIENT sin lead, con número libre → HTTP ${res.status} (esperado 400)`);

      res = await sendAs(adminCookie, { leadId: foreignLead.id, recipient: LEAD_PHONE });
      record("SMS-18", res.status === 404, `Admin con lead de otra organización → HTTP ${res.status} (esperado 404)`);

      // Número del body inválido: si la ruta lo usara respondería 400; con el del lead
      // (dado de baja) responde 409.
      res = await sendAs(alphaCookie, { leadId: lead.id, recipient: "123" });
      record(
        "SMS-19",
        res.status === 409,
        `CLIENT Alpha a su lead con otro número → HTTP ${res.status} (409 = se ignoró el número del navegador)`
      );
    } else {
      record("SMS-16", false, "Omitido: la baja no quedó registrada (SMS-07) y los envíos serían reales");
    }

    // 9. Envío masivo: solo admin; omite bajas y leads sin teléfono
    const bulkBody = { filter: { clientId: alpha.id }, template: "Hola {{nombre}}", dryRun: true };
    res = await req("/api/messages/sms/bulk", { method: "POST", headers: auth(alphaCookie), body: JSON.stringify(bulkBody) });
    record("SMS-12", res.status === 403, `Masivo como CLIENT → HTTP ${res.status} (esperado 403)`);

    res = await req("/api/messages/sms/bulk", { method: "POST", headers: auth(adminCookie), body: JSON.stringify(bulkBody) });
    const preview = (await json(res)).preview;
    record(
      "SMS-13",
      preview?.matched === 2 && preview?.eligible === 0 && preview?.skipped.optedOut === 1 && preview?.skipped.withoutPhone === 1,
      `Vista previa → ${preview?.matched} leads, ${preview?.eligible} elegibles, ${preview?.skipped.optedOut} de baja, ${preview?.skipped.withoutPhone} sin teléfono`
    );

    // Igual que SMS-11: el envío real solo se lanza si la vista previa confirmó 0 elegibles.
    if (preview?.eligible === 0) {
      const before = await prisma.message.count({ where: { leadId: { in: created.leads }, direction: "outbound" } });
      res = await req("/api/messages/sms/bulk", { method: "POST", headers: auth(adminCookie), body: JSON.stringify({ ...bulkBody, dryRun: false, batchId: crypto.randomUUID() }) });
      const bulkResult = (await json(res)).result;
      const after = await prisma.message.count({ where: { leadId: { in: created.leads }, direction: "outbound" } });
      record(
        "SMS-14",
        res.status === 200 && bulkResult?.sent === 0 && after === before,
        `Masivo real sin elegibles → HTTP ${res.status}, enviados ${bulkResult?.sent}, mensajes nuevos ${after - before}`
      );
    } else {
      record("SMS-14", false, "Omitido: la vista previa no dio 0 elegibles y el envío sería real");
    }

    res = await req("/api/messages/sms/bulk", {
      method: "POST",
      headers: auth(adminCookie),
      body: JSON.stringify({ ...bulkBody, template: "Hola {{nombr}}" }),
    });
    record("SMS-15", res.status === 400, `Masivo con variable mal escrita → HTTP ${res.status} (esperado 400)`);
  } catch (err) {
    console.error("Error fatal:", err);
    record("FATAL", false, err.message);
  } finally {
    await prisma.message.deleteMany({ where: { OR: [{ leadId: { in: created.leads } }, { recipient: { in: [LEAD_PHONE, UNKNOWN_PHONE] } }] } });
    // La baja es global (SmsOptOut): sin esto los números de prueba quedarían de baja para siempre.
    await prisma.smsOptOut.deleteMany({ where: { phone: { in: [LEAD_PHONE, UNKNOWN_PHONE] } } });
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
    // La organización de prueba se lleva por cascada su lead.
    if (created.orgs.length) await prisma.organization.deleteMany({ where: { id: { in: created.orgs } } });

    const passed = results.filter((r) => r.pass).length;
    console.log(`\nRESUMEN: ${passed} / ${results.length} PASADAS\n`);
    await prisma.$disconnect();
    process.exit(passed === results.length ? 0 : 1);
  }
}

run();
