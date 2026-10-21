const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const leads = await prisma.lead.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      clientId: true,
      client: { select: { id: true, name: true } },
      campaign: true,
      externalLeadId: true,
      externalFormId: true,
      externalAdId: true,
      externalCampaignId: true,
      notes: true,
      source: true,
      owner: { select: { name: true } }
    }
  });
  console.log("LEADS SAMPLE:");
  console.log(JSON.stringify(leads, null, 2));

  // Also check form details or connected accounts/pages
  const pages = await prisma.connectedPage.findMany({
    select: {
      id: true,
      pageId: true,
      pageName: true,
      clientId: true,
      client: { select: { id: true, name: true } }
    }
  });
  console.log("CONNECTED PAGES:");
  console.log(JSON.stringify(pages, null, 2));

  const accounts = await prisma.connectedAccount.findMany({
    select: {
      id: true,
      accountId: true,
      accountName: true,
      clientId: true,
      client: { select: { id: true, name: true } }
    }
  });
  console.log("CONNECTED ACCOUNTS:");
  console.log(JSON.stringify(accounts, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
