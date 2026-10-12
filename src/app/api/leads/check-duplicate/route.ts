import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { validateAndNormalizePhone } from "@/lib/phone";
import { findDuplicateLeads } from "@/lib/validations/duplicate-detector";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const excludeLeadId = searchParams.get("excludeLeadId") || undefined;

    const phoneCheck = phone ? validateAndNormalizePhone(phone) : null;
    const normalizedPhone = phoneCheck?.normalized || null;

    const matches = await findDuplicateLeads({
      organizationId: user!.organizationId,
      email,
      phone,
      normalizedPhone,
      excludeLeadId,
    });

    return NextResponse.json({
      success: true,
      hasDuplicates: matches.length > 0,
      matches,
    });
  } catch (error: any) {
    console.error("GET /api/leads/check-duplicate error:", error);
    return NextResponse.json(
      { success: false, error: "Error al verificar duplicados." },
      { status: 500 }
    );
  }
}
