const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

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

async function provisionUsers() {
  console.log("🔒 [Bunker CRM] Iniciando aprovisionamiento y sincronización de usuarios...");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Ensure default organization exists
  let org = await prisma.organization.findFirst({
    where: { slug: "bunker-agency" },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Bunker Marketing Agency",
        slug: "bunker-agency",
        plan: "enterprise_hybrid",
      },
    });
    console.log(`✅ Organización base creada: ${org.name}`);
  }

  // List existing Supabase Auth users
  const { data: authList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Error al consultar Supabase Auth:", listError.message);
    process.exit(1);
  }

  const authUsersByEmail = new Map();
  for (const au of authList.users) {
    if (au.email) {
      authUsersByEmail.set(au.email.toLowerCase(), au);
    }
  }

  // Pre-configured users. Initial passwords MUST come from the environment (min. 12 chars);
  // there is intentionally no default so a well-known password is never provisioned.
  const seedUsers = [
    {
      email: "admin@bunkermarketing.io",
      name: "Dirección Bunker",
      role: "admin",
      envName: "ADMIN_INITIAL_PASSWORD",
      defaultPassword: process.env.ADMIN_INITIAL_PASSWORD,
    },
    {
      email: "carlos.sales@bunkermarketing.io",
      name: "Carlos Méndez (Comercial)",
      role: "sales_rep",
      envName: "SALES_INITIAL_PASSWORD",
      defaultPassword: process.env.SALES_INITIAL_PASSWORD,
    },
    {
      email: "sofia.marketing@bunkermarketing.io",
      name: "Sofía Castillo (Marketing)",
      role: "marketing_specialist",
      envName: "MKT_INITIAL_PASSWORD",
      defaultPassword: process.env.MKT_INITIAL_PASSWORD,
    },
  ];

  for (const su of seedUsers) {
    const emailLower = su.email.toLowerCase();
    let authUser = authUsersByEmail.get(emailLower);

    if (!authUser) {
      if (!su.defaultPassword || su.defaultPassword.length < 12) {
        console.error(
          `❌ ${su.email}: defina ${su.envName} (mínimo 12 caracteres) para crear este usuario. Omitido.`
        );
        continue;
      }
      console.log(`👤 Creando usuario en Supabase Auth: ${su.email}...`);
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: emailLower,
        password: su.defaultPassword,
        email_confirm: true,
        user_metadata: {
          name: su.name,
          role: su.role,
        },
      });

      if (createError) {
        console.error(`❌ Error al crear usuario ${su.email}:`, createError.message);
        continue;
      }
      authUser = created.user;
      authUsersByEmail.set(emailLower, authUser);
      console.log(`✅ Usuario creado en Supabase Auth: ${su.email} [ID: ${authUser.id}]`);
    } else {
      console.log(`ℹ️ Usuario ya existe en Supabase Auth: ${su.email} [ID: ${authUser.id}]`);
    }

    // Upsert or link in Prisma User table
    let dbUser = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: emailLower,
          name: su.name,
          passwordHash: "managed_by_supabase_auth",
          role: su.role,
          supabaseAuthId: authUser.id,
          isActive: true,
        },
      });
      console.log(`✅ Registro de usuario creado en Prisma: ${dbUser.email}`);
    } else {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          supabaseAuthId: authUser.id,
          role: su.role,
          name: su.name,
          isActive: true,
        },
      });
      console.log(`🔗 Usuario vinculado en Prisma con Supabase Auth: ${dbUser.email}`);
    }

    // Ensure Organization Membership
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: dbUser.id,
        },
      },
      update: {
        role: su.role,
      },
      create: {
        organizationId: org.id,
        userId: dbUser.id,
        role: su.role,
      },
    });
    console.log(`🏢 Membresía confirmada en ${org.name} para ${dbUser.email} con rol ${su.role}`);
  }

  console.log("\n🎯 Aprovisionamiento finalizado con éxito.");
}

provisionUsers()
  .catch((e) => {
    console.error("❌ Error en provisionUsers:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
