const { createDecipheriv, createHash } = require("crypto");
const { PrismaClient } = require("./node_modules/@prisma/client");
const prisma = new PrismaClient();

function getKey() {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  return createHash("sha256").update(secret).digest();
}

function decryptSecret(payload) {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

async function main() {
  const account = await prisma.connectedAccount.findFirst({
    where: { accountName: "Workshop Carrito Naranja" },
  });
  const token = decryptSecret(account.accessTokenEnc);

  const pageRes = await fetch(`https://graph.facebook.com/v21.0/1539491809672725?fields=id,name,access_token&access_token=${token}`);
  const pageJson = await pageRes.json();
  console.log("Page 1539491809672725 info:", pageJson);

  // Check leadgen forms on this page
  const formsRes = await fetch(`https://graph.facebook.com/v21.0/1539491809672725/leadgen_forms?access_token=${token}`);
  const formsJson = await formsRes.json();
  console.log("Forms on page 1539491809672725:", JSON.stringify(formsJson, null, 2));

  // Also check leadgen forms directly on the ad account
  const adFormsRes = await fetch(`https://graph.facebook.com/v21.0/${account.externalId}/leadgen_forms?access_token=${token}`);
  const adFormsJson = await adFormsRes.json();
  console.log("Forms on ad account:", JSON.stringify(adFormsJson, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
