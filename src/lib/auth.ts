import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";

export const AUTH_COOKIE_NAME = "bunker_session";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
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

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role, // Server-verified role from DB
    supabaseAuthId: supabaseUser.id,
    organizationId: primaryMembership.organization.id,
    organizationName: primaryMembership.organization.name,
    organizationSlug: primaryMembership.organization.slug,
  };
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
 * Middleware helper for Route Handlers requiring specific roles.
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

  if (!allowedRoles.includes(user.role)) {
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
 * Shorthand for admin-only operations.
 */
export async function requireAdmin(req: NextRequest) {
  return requireRole(req, ["admin"]);
}
