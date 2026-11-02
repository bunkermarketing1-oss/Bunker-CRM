import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ROLES, isClientOwnerRole, normalizeRole, type UserRole } from "@/lib/roles";

export const AUTH_COOKIE_NAME = "bunker_session";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// Los roles viven en `lib/roles.ts` (puro, lo usa también el middleware); se re-exportan aquí
// porque las rutas ya los importan de `@/lib/auth`.
export { ROLES, normalizeRole, isClientRole, isBunkerRole, isClientOwnerRole, type UserRole } from "@/lib/roles";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId: string | null;
  clientName: string | null;
  clientLogoUrl?: string | null;
  isClientUser: boolean;
  /**
   * Dueño del negocio del cliente: sigue siendo usuario de portal (`isClientUser`, `clientId`
   * forzado) y además puede supervisar a los asesores de su empresa.
   */
  isClientOwner: boolean;
  supabaseAuthId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
}

/**
 * Extracts and verifies the access token from request or server cookies.
 */
export async function getVerifiedSupabaseUser(tokenOrReq?: string | NextRequest) {
  try {
    let token: string | undefined;

    if (typeof tokenOrReq === "string") {
      token = tokenOrReq;
    } else if (tokenOrReq) {
      // Check Bearer header first, then cookie
      const authHeader = tokenOrReq.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      } else {
        token = tokenOrReq.cookies.get(AUTH_COOKIE_NAME)?.value;
      }
    } else {
      const cookieStore = cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    }

    if (!token) {
      return null;
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch (err) {
    console.error("Error al verificar token de Supabase:", err);
    return null;
  }
}

/**
 * Resolves the authenticated user along with their active organization and verified role.
 */
export async function getCurrentUser(req?: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const supabaseUser = await getVerifiedSupabaseUser(req);
    if (!supabaseUser || !supabaseUser.email) {
      return null;
    }

    const email = supabaseUser.email.toLowerCase();

    // Find user in Prisma by supabaseAuthId or email
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseAuthId: supabaseUser.id },
          { email: email },
        ],
        isActive: true,
      },
      include: {
        client: { select: { id: true, name: true, logoUrl: true } },
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!dbUser) {
      return null;
    }

    // Auto-link supabaseAuthId if not yet linked
    if (!dbUser.supabaseAuthId) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { supabaseAuthId: supabaseUser.id },
        include: {
          client: { select: { id: true, name: true, logoUrl: true } },
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });
    }

    // Resolve primary organization membership
    let primaryMembership = dbUser.memberships[0];

    // If user has no membership yet, attach them to default org
    if (!primaryMembership) {
      const defaultOrg = await prisma.organization.findFirst({
        where: { slug: "bunker-agency" },
      });
      if (defaultOrg) {
        const newMember = await prisma.organizationMember.create({
          data: {
            organizationId: defaultOrg.id,
            userId: dbUser.id,
            role: dbUser.role,
          },
          include: {
            organization: true,
          },
        });
        primaryMembership = newMember;
      }
    }

    if (!primaryMembership || !primaryMembership.organization) {
      return null;
    }

    const role = normalizeRole(dbUser.role);
    const isClient = role === ROLES.CLIENT || Boolean(dbUser.clientId);

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: isClient ? ROLES.CLIENT : ROLES.ADMIN, // Server-verified canonical role
      clientId: dbUser.clientId || null,
      clientName: dbUser.client?.name || null,
      clientLogoUrl: dbUser.client?.logoUrl || null,
      isClientUser: isClient,
      // Sin empresa no hay a quién supervisar: un CLIENT_OWNER sin clientId queda como asesor.
      isClientOwner: isClient && isClientOwnerRole(dbUser.role) && Boolean(dbUser.clientId),
      supabaseAuthId: supabaseUser.id,
      organizationId: primaryMembership.organization.id,
      organizationName: primaryMembership.organization.name,
      organizationSlug: primaryMembership.organization.slug,
    };
  } catch (err) {
    console.error("Error al obtener usuario actual en la base de datos:", err);
    return null;
  }
}

/**
 * Middleware helper for Route Handlers requiring authentication.
 */
export async function requireAuth(req: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  errorResponse: NextResponse | null;
}> {
  const user = await getCurrentUser(req);
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: "No autorizado. Sesión inválida o expirada." },
        { status: 401 }
      ),
    };
  }
  return { user, errorResponse: null };
}

/**
 * Validates that the authenticated user has one of the allowed roles.
 * Normalizes all role strings to canonical ADMIN or CLIENT.
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: string[]
): Promise<{
  user: AuthenticatedUser | null;
  errorResponse: NextResponse | null;
}> {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) {
    return { user: null, errorResponse };
  }

  const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));
  if (!normalizedAllowed.includes(user.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Acceso denegado. No posee los permisos requeridos para esta operación.",
        },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}

/**
 * Restricts access to ADMIN role (Bunker Agency internal administration).
 * Explicitly rejects CLIENT users with HTTP 403 Forbidden.
 */
export async function requireAdmin(req: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  errorResponse: NextResponse | null;
}> {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) {
    return { user: null, errorResponse };
  }

  if (user.isClientUser || user.role !== ROLES.ADMIN) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Acceso denegado. Este módulo o recurso está reservado exclusivamente para administradores internos de Bunker Agency.",
        },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}

/**
 * Alias for requireAdmin ensuring all Bunker internal modules require ADMIN role.
 */
export const requireBunkerRole = requireAdmin;

/**
 * Supervisión de asesores (vista en vivo, escucha): admin de Bunker o dueño del cliente.
 * Un asesor (CLIENT) recibe 403. El scope de cliente lo sigue forzando la ruta con `scopeFromUser`.
 */
export async function requireSupervisor(req: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  errorResponse: NextResponse | null;
}> {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse || !user) {
    return { user: null, errorResponse };
  }

  if (user.isClientUser && !user.isClientOwner) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: "Acceso denegado. Solo el dueño de la empresa o Bunker pueden supervisar al equipo." },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}
