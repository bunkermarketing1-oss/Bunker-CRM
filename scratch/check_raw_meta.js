const { PrismaClient } = require('@prisma/client');
const { createDecipheriv, createHash } = require('crypto');

const prisma = new PrismaClient();

function decryptSecret(payload) {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  const key = createHash('sha256').update(secret).digest();
  const [iv, tag, data] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

async function inspectMetaLead() {
  const account = await prisma.connectedAccount.findFirst({
    where: { integration: { provider: 'meta' } },
    select: { accessTokenEnc: true }
  });
  const token = decryptSecret(account.accessTokenEnc);

  // Fetch leads with all available fields from form 1230453512591237
  const res = await fetch('https://graph.facebook.com/v19.0/1230453512591237/leads?fields=id,created_time,campaign_id,campaign_name,ad_id,ad_name,adset_id,adset_name,form_id,is_organic,field_data&limit=5', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log("META FORM LEADS RAW SAMPLE:", JSON.stringify(data, null, 2));

  // Also check form metadata
  const formRes = await fetch('https://graph.facebook.com/v19.0/1230453512591237?fields=id,name,status,leads_count,page{id,name}', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const formData = await formRes.json();
  console.log("FORM METADATA:", JSON.stringify(formData, null, 2));
}

inspectMetaLead().catch(console.error).finally(() => prisma.$disconnect());
