const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

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
const BASE_URL = "http://127.0.0.1:3005";

async function makeRequest(urlPath, options = {}) {
  const fullUrl = `${BASE_URL}${urlPath}`;
  return await fetch(fullUrl, { ...options, redirect: "manual" });
}

function extractCookie(res, cookieName) {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

const testResults = [];
function record(testId, passed, message) {
  testResults.push({ testId, passed, message });
  console.log(`${passed ? "✅" : "❌"} [${testId}] ${message}`);
}

async function runLeadsSuite() {
  console.log("\n🧪 =============================================================");
  console.log("   FASE 2 — SUITE DE PRUEBAS DE VALIDACIÓN Y MÓDULO DE LEADS");
  console.log("=============================================================\n");

  // Login as Admin
  const loginRes = await makeRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@bunkermarketing.io",
      password: "bunker2026",
    }),
  });
  const adminCookie = extractCookie(loginRes, "bunker_session");
  if (!adminCookie) {
    console.error("❌ No se pudo autenticar como admin para ejecutar las pruebas.");
    process.exit(1);
  }

  // 1. Zod: Nombre en blanco
  try {
    const res1 = await makeRequest("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${adminCookie}`,
      },
      body: JSON.stringify({ name: "   " }),
    });
    const json1 = await res1.json().catch(() => ({}));
    const passes1 = res1.status === 400 && json1.fieldErrors?.name;
    record(
      "ZOD-01",
      passes1,
      `Rechazo de nombre compuesto de solo espacios HTTP 400: "${json1.error}"`
    );
  } catch (e) {
    record("ZOD-01", false, e.message);
  }

  // 2. Zod: Email inválido
  try {
    const res2 = await makeRequest("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${adminCookie}`,
      },
      body: JSON.stringify({
        name: "Prospecto Prueba",
        email: "correo-invalido-sin-arroba",
      }),
    });
    const json2 = await res2.json().catch(() => ({}));
    const passes2 = res2.status === 400 && json2.fieldErrors?.email;
    record(
      "ZOD-02",
      passes2,
      `Rechazo de formato de email inválido HTTP 400: "${json2.error}"`
    );
  } catch (e) {
    record("ZOD-02", false, e.message);
  }

  // 3. Validación Telefónica: Número inválido
  try {
    const res3 = await makeRequest("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${adminCookie}`,
      },
      body: JSON.stringify({
        name: "Prospecto Prueba Teléfono",
        phone: "12345",
      }),
    });
    const json3 = await res3.json().catch(() => ({}));
    const passes3 = res3.status === 400 && json3.fieldErrors?.phone;
    record(
      "PHONE-01",
      passes3,
      `Rechazo de teléfono demasiado corto/inválido HTTP 400: "${json3.error}"`
    );
  } catch (e) {
    record("PHONE-01", false, e.message);
  }

  // 4. Validación Telefónica & Normalización E.164 Exitosa
  let createdLeadId = null;
  const testPhone = "+52 55 4912 3011";
  const testEmail = `lead.test.${Date.now()}@bunkertest.io`;

  try {
    const res4 = await makeRequest("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${adminCookie}`,
      },
      body: JSON.stringify({
        name: "Dra. Valentina Ramos",
        companyName: "Clínica Dermato Avanzada",
        email: testEmail,
        phone: testPhone,
        source: "meta_ads",
        campaign: "Campaña Preventa Cancún 2026",
        estimatedValue: 75000,
        notes: "Interesada en prospección con IA",
      }),
    });
    const json4 = await res4.json().catch(() => ({}));
    createdLeadId = json4.lead?.id;

    const passes4 =
      res4.status === 201 &&
      json4.lead?.normalizedPhone === "+525549123011" &&
      json4.lead?.campaign === "Campaña Preventa Cancún 2026";

    record(
      "PHONE-02",
      passes4,
      `Teléfono internacional normalizado exitosamente a E.164: "${json4.lead?.normalizedPhone}" (Formato legible: "${json4.lead?.phone}")`
    );
  } catch (e) {
    record("PHONE-02", false, e.message);
  }

  // 5. Trazabilidad de Origen
  try {
    const leadInDb = await prisma.lead.findUnique({
      where: { id: createdLeadId },
    });
    const passes5 =
      leadInDb &&
      leadInDb.source === "meta_ads" &&
      leadInDb.campaign === "Campaña Preventa Cancún 2026";
    record(
      "ORIGIN-01",
      passes5,
      `Trazabilidad de origen y campaña persistida correctamente en base de datos: [${leadInDb?.source} | ${leadInDb?.campaign}]`
    );
  } catch (e) {
    record("ORIGIN-01", false, e.message);
  }

  // 6. Detección Prudente de Duplicados (Mismo email/teléfono)
  try {
    const res6 = await makeRequest("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${adminCookie}`,
      },
      body: JSON.stringify({
        name: "Otro Registro Dra. Valentina",
        email: testEmail, // duplicate!
        phone: testPhone, // duplicate!
        source: "website",
      }),
    });
    const json6 = await res6.json().catch(() => ({}));
    const passes6 =
      res6.status === 409 &&
      json6.duplicateDetected === true &&
      json6.matches?.length > 0;

    record(
      "DUP-01",
      passes6,
      `Detección preventiva de duplicados activada HTTP 409: "${json6.error}" (${json6.matches?.length} coincidencia(s))`
    );
  } catch (e) {
    record("DUP-01", false, e.message);
  }

  // 7. Bypass Explícito de Duplicado con forceDuplicate: true
  let forceLeadId = null;
  try {
    const res7 = await makeRequest("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${adminCookie}`,
      },
      body: JSON.stringify({
        name: "Registro Reconfirmado Valentina",
        email: testEmail,
        phone: testPhone,
        source: "referral",
        forceDuplicate: true,
      }),
    });
    const json7 = await res7.json().catch(() => ({}));
    forceLeadId = json7.lead?.id;
    const passes7 = res7.status === 201 && Boolean(forceLeadId);
    record(
      "DUP-02",
      passes7,
      `Registro con forceDuplicate=true permitido exitosamente tras confirmación comercial.`
    );
  } catch (e) {
    record("DUP-02", false, e.message);
  }

  // 8. Edición de Prospecto (PUT /api/leads) y Auditoría de cambio de origen
  try {
    const res8 = await makeRequest("/api/leads", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${adminCookie}`,
      },
      body: JSON.stringify({
        id: createdLeadId,
        status: "contacted",
        source: "google_ads", // changed source
        estimatedValue: 85000,
      }),
    });
    const json8 = await res8.json().catch(() => ({}));

    // Verify audit log
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityId: createdLeadId,
        action: "lead_source_modified",
      },
    });

    const passes8 =
      res8.status === 200 &&
      json8.lead?.status === "contacted" &&
      json8.lead?.source === "google_ads" &&
      auditLogs.length > 0;

    record(
      "EDIT-01",
      passes8,
      `Actualización de prospecto completada. Cambio de canal registrado en log de auditoría.`
    );
  } catch (e) {
    record("EDIT-01", false, e.message);
  }

  // 9. Conversión de Lead a Cliente (POST /api/leads/[id]/convert)
  try {
    const res9 = await makeRequest(`/api/leads/${createdLeadId}/convert`, {
      method: "POST",
      headers: { Cookie: `bunker_session=${adminCookie}` },
    });
    const json9 = await res9.json().catch(() => ({}));

    const convertedLead = await prisma.lead.findUnique({
      where: { id: createdLeadId },
    });

    const passes9 =
      res9.status === 200 &&
      json9.success === true &&
      convertedLead?.status === "converted" &&
      Boolean(json9.client?.id) &&
      Boolean(json9.opportunity?.id);

    record(
      "CONVERT-01",
      passes9,
      `Conversión a Cliente y Oportunidad en Pipeline completada. Estado del prospecto: '${convertedLead?.status}'.`
    );
  } catch (e) {
    record("CONVERT-01", false, e.message);
  }

  // Cleanup test leads
  if (createdLeadId) {
    await prisma.lead.delete({ where: { id: createdLeadId } }).catch(() => {});
  }
  if (forceLeadId) {
    await prisma.lead.delete({ where: { id: forceLeadId } }).catch(() => {});
  }

  console.log("\n=============================================================");
  const allPassed = testResults.every((r) => r.passed);
  console.log(
    `RESUMEN FASE 2: ${testResults.filter((r) => r.passed).length}/${
      testResults.length
    } pruebas superadas exitosamente.`
  );
  console.log("=============================================================\n");

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

runLeadsSuite().catch((err) => {
  console.error("Fatal suite error:", err);
  process.exit(1);
});
