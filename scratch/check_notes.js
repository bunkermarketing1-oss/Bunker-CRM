const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const leads = await prisma.lead.findMany({
    where: { source: 'meta_ads' },
    select: {
      id: true,
      name: true,
      campaign: true,
      externalFormId: true,
      externalAdId: true,
      notes: true,
      client: { select: { id: true, name: true } }
    },
    take: 10
  });
  console.log(JSON.stringify(leads, null, 2));

  const nullCampaignCount = await prisma.lead.count({
    where: { source: 'meta_ads', campaign: null }
  });
  console.log("Leads with campaign: null =", nullCampaignCount);
}

check().catch(console.error).finally(() => prisma.$disconnect());
