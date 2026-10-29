import { PrismaClient } from "@prisma/client";
import { createDecipheriv, createHash } from "crypto";

const prisma = new PrismaClient();

function getKey() {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!secret) throw new Error("INTEGRATIONS_ENCRYPTION_KEY missing");
  return createHash("sha256").update(secret).digest();
}

function decryptSecret(payload) {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(data, undefined, "utf8") + decipher.final("utf8");
}

async function run() {
  console.log("=== DIAGNÓSTICO DE INSTAGRAM DIRECT ===");

  // 1. Cuentas conectadas en BD
  const accounts = await prisma.connectedAccount.findMany({
    where: {
      integration: { provider: "meta" },
    },
    select: {
      id: true,
      accountName: true,
      accountType: true,
      externalId: true,
      accessTokenEnc: true,
      clientId: true,
    },
  });

  console.log(`Encontradas ${accounts.length} cuentas Meta en BD:`);
  for (const acc of accounts) {
    console.log(`- [${acc.accountType}] "${acc.accountName}" ID: ${acc.externalId} (Client: ${acc.clientId || 'sin asignar'})`);
  }

  // 2. Probar la página de Facebook principal
  const page = accounts.find((a) => a.accountType === "facebook_page");
  if (!page || !page.accessTokenEnc) {
    console.log("No se encontró facebook_page con token");
    return;
  }

  const token = decryptSecret(page.accessTokenEnc);

  // 3. Consultar a Meta por la cuenta de Instagram vinculada a esta Fan Page
  console.log(`\nConsultando Instagram Business Account vinculada a Page ${page.externalId}...`);
  const igRes = await fetch(
    `https://graph.facebook.com/v21.0/${page.externalId}?fields=instagram_business_account,connected_instagram_account&access_token=${token}`
  );
  const igData = await igRes.json();
  console.log("Resultado vinculación Instagram:", JSON.stringify(igData, null, 2));

  // 4. Consultar permisos del token
  console.log("\nConsultando permisos concedidos al token de Meta...");
  const debugRes = await fetch(
    `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`
  );
  const debugData = await debugRes.json();
  console.log("Scopes concedidos:", debugData?.data?.scopes || debugData);

  // 5. Si existe Instagram Business Account, consultar conversaciones
  const igId = igData?.instagram_business_account?.id || igData?.connected_instagram_account?.id;
  if (igId) {
    console.log(`\nProbando lectura de conversaciones en Instagram Account ${igId}...`);
    const convRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}/conversations?platform=instagram&access_token=${token}`
    );
    const convData = await convRes.json();
    console.log("Conversaciones de Instagram:", JSON.stringify(convData, null, 2));

    // También probar con fields
    const convRes2 = await fetch(
      `https://graph.facebook.com/v21.0/${igId}/conversations?fields=id,updated_time,snippet,unread_count,senders,messages.limit(5)&access_token=${token}`
    );
    const convData2 = await convRes2.json();
    console.log("Conversaciones de Instagram (sin platform param):", JSON.stringify(convData2, null, 2));
  } else {
    console.log("\n⚠️ La página de Facebook no tiene un instagram_business_account vinculado devuelto por la API.");
  }

  // 6. Revisar suscripciones a Webhooks de la página
  console.log("\nRevisando suscripciones activas de la página de Facebook...");
  const subRes = await fetch(
    `https://graph.facebook.com/v21.0/${page.externalId}/subscribed_apps?access_token=${token}`
  );
  const subData = await subRes.json();
  console.log("Subscribed apps:", JSON.stringify(subData, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
