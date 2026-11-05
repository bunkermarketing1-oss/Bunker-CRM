import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { createLeadSchema, updateLeadSchema } from "@/lib/validations/lead";
import { validateAndNormalizePhone } from "@/lib/phone";
import { findDuplicateLeads } from "@/lib/validations/duplicate-detector";
import { computeInitialQualification } from "@/lib/lead-scoring";
import { clientBelongsToOrg } from "@/lib/validation-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const ownerId = searchParams.get("ownerId");
    const clientId = searchParams.get("clientId");
    const hasPhone = searchParams.get("hasPhone");

    const where: any = {
      organizationId: user!.organizationId,
      isDeleted: false,
    };

    // Client user is restricted strictly to leads belonging to their company
    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json({ success: true, leads: [] });
      }
      where.clientId = user!.clientId;
    } else if (clientId && clientId !== "all") {
      if (clientId === "unassigned") {
        where.clientId = null;
      } else {
        where.clientId = clientId;
      }
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (source && source !== "all") {
      where.source = source;
    }

    if (ownerId && ownerId !== "all") {
      if (ownerId === "unassigned") {
        where.ownerId = null;
      } else {
        where.ownerId = ownerId;
      }
    }

    if (hasPhone === "true") {
      where.phone = { not: null };
      where.NOT = { phone: "" };
    }

    if (search.trim()) {
      const cleanSearch = search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: cleanSearch, mode: "insensitive" } },
            { email: { contains: cleanSearch, mode: "insensitive" } },
            { companyName: { contains: cleanSearch, mode: "insensitive" } },
            { phone: { contains: cleanSearch, mode: "insensitive" } },
            { normalizedPhone: { contains: cleanSearch, mode: "insensitive" } },
            { campaign: { contains: cleanSearch, mode: "insensitive" } },
            { notes: { contains: cleanSearch, mode: "insensitive" } },
          ],
        },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        client: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar prospectos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const rawBody = await req.json().catch(() => ({}));

    // 1. Zod Validation on Server
    const validationResult = createLeadSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0] || "Datos inválidos";
      return NextResponse.json(
        {
          success: false,
          error: firstError,
          fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 2. Validate Assigned Owner if provided
    const assignedOwnerId = data.ownerId || user!.id;
    if (data.ownerId) {
      const isMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: user!.organizationId,
          userId: data.ownerId,
        },
      });
      if (!isMember) {
        return NextResponse.json(
          {
            success: false,
            error: "El asesor responsable asignado no pertenece a su organización.",
          },
          { status: 400 }
        );
      }
    }

    // 3. International Phone Normalization (E.164)
    let normalizedPhone: string | null = null;
    let formattedPhone = data.phone;
    if (data.phone) {
      const phoneCheck = validateAndNormalizePhone(data.phone);
      if (phoneCheck.isValid && phoneCheck.normalized) {
        normalizedPhone = phoneCheck.normalized;
        formattedPhone = phoneCheck.formatted || data.phone;
      }
    }

    // 4. Duplicate Lead Detection
    if (!data.forceDuplicate && (data.email || normalizedPhone || data.phone)) {
      const duplicates = await findDuplicateLeads({
        organizationId: user!.organizationId,
        email: data.email,
        phone: data.phone,
        normalizedPhone,
      });

      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            success: false,
            duplicateDetected: true,
            matches: duplicates,
            error:
              "Se detectó un prospecto existente con el mismo correo electrónico o teléfono en su organización.",
          },
          { status: 409 } // 409 Conflict
        );
      }
    }

    // 5. Calculate algorithmic AI qualification score (budget thresholds expressed in USD)
    const qualification = data.qualification ?? computeInitialQualification(data);

    // Resolve target clientId
    let targetClientId = data.clientId || (rawBody as any)?.clientId || null;
    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json({ success: false, error: "Usuario cliente no tiene empresa asociada." }, { status: 403 });
      }
      targetClientId = user!.clientId;
    }
    if (!user!.isClientUser && targetClientId) {
      if (!(await clientBelongsToOrg(user!.organizationId, targetClientId))) {
        return NextResponse.json(
          { success: false, error: "La empresa o cliente especificado no pertenece a su organización." },
          { status: 400 }
        );
      }
    }

    // 6. Create Lead in Database with Strict Organization and Client Isolation
    const lead = await prisma.lead.create({
      data: {
        organizationId: user!.organizationId, // Non-tamperable
        clientId: targetClientId,
        name: data.name,
        companyName: data.companyName,
        email: data.email,
        phone: formattedPhone,
        normalizedPhone,
        source: data.source,
        campaign: data.campaign,
        externalLeadId: data.externalLeadId,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        notes: data.notes,
        status: data.status,
        qualification,
        estimatedValue: data.estimatedValue,
        ownerId: assignedOwnerId,
        aiSummary: data.aiSummary,
        isDemo: false,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // 7. Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "lead_created",
        entityType: "Lead",
        entityId: lead.id,
        detailsJson: JSON.stringify({
          name: lead.name,
          email: lead.email,
          phone: lead.normalizedPhone || lead.phone,
          source: lead.source,
          campaign: lead.campaign,
        }),
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/leads error:", error);
    return NextResponse.json(
      { success: false, error: "Error al registrar prospecto." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const rawBody = await req.json().catch(() => ({}));

    // 1. Zod Validation on Server
    const validationResult = updateLeadSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0] || "Datos inválidos";
      return NextResponse.json(
        {
          success: false,
          error: firstError,
          fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 2. Verify lead belongs to user's organization
    const existing = await prisma.lead.findFirst({
      where: {
        id: data.id,
        organizationId: user!.organizationId,
        isDeleted: false,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Prospecto no encontrado en su organización." },
        { status: 404 }
      );
    }

    if (user!.isClientUser && existing.clientId !== user!.clientId) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado. No puede modificar prospectos de otra empresa." },
        { status: 403 }
      );
    }

    // 3. Verify ownerId if updated
    if (data.ownerId) {
      const isMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: user!.organizationId,
          userId: data.ownerId,
        },
      });
      if (!isMember) {
        return NextResponse.json(
          {
            success: false,
            error: "El asesor asignado no pertenece a su organización.",
          },
          { status: 400 }
        );
      }
    }

    // 4. Normalize phone if updated
    let normalizedPhone: string | null | undefined = undefined;
    let formattedPhone = data.phone;
    if (data.phone !== undefined) {
      if (data.phone) {
        const phoneCheck = validateAndNormalizePhone(data.phone);
        if (phoneCheck.isValid && phoneCheck.normalized) {
          normalizedPhone = phoneCheck.normalized;
          formattedPhone = phoneCheck.formatted || data.phone;
        } else {
          normalizedPhone = null;
        }
      } else {
        normalizedPhone = null;
      }
    }

    // 5. Conversion must go through the dedicated endpoint so that the Client and the
    //    Opportunity are created atomically. Setting the status by hand would leave a
    //    "converted" lead without any client and hide the Convert action.
    if (data.status === "converted" && existing.status !== "converted") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Para marcar un prospecto como convertido use la acción \"Convertir a Cliente\".",
        },
        { status: 400 }
      );
    }

    // 6. Traceability: record relevant changes (field names for PII, values for business fields)
    const businessChanges: Record<string, { from: unknown; to: unknown }> = {};
    const trackBusiness = (field: string, from: unknown, to: unknown) => {
      if (to !== undefined && from !== to) businessChanges[field] = { from, to };
    };
    trackBusiness("status", existing.status, data.status);
    trackBusiness("ownerId", existing.ownerId, data.ownerId);
    trackBusiness("estimatedValue", existing.estimatedValue, data.estimatedValue);

    const changedFields: string[] = [];
    const trackField = (field: string, from: unknown, to: unknown) => {
      if (to !== undefined && (from ?? null) !== (to ?? null)) changedFields.push(field);
    };
    trackField("name", existing.name, data.name);
    trackField("companyName", existing.companyName, data.companyName);
    trackField("email", existing.email, data.email);
    trackField("phone", existing.phone, formattedPhone);
    trackField("campaign", existing.campaign, data.campaign);
    trackField("notes", existing.notes, data.notes);

    const auditOperations: any[] = [];
    if (data.source && data.source !== existing.source) {
      auditOperations.push(
        prisma.auditLog.create({
          data: {
            organizationId: user!.organizationId,
            userId: user!.id,
            action: "lead_source_modified",
            entityType: "Lead",
            entityId: existing.id,
            detailsJson: JSON.stringify({
              previousSource: existing.source,
              newSource: data.source,
            }),
          },
        })
      );
    }
    if (Object.keys(businessChanges).length > 0 || changedFields.length > 0) {
      auditOperations.push(
        prisma.auditLog.create({
          data: {
            organizationId: user!.organizationId,
            userId: user!.id,
            action: "lead_updated",
            entityType: "Lead",
            entityId: existing.id,
            detailsJson: JSON.stringify({ changes: businessChanges, changedFields }),
          },
        })
      );
    }

    // 7. Update Lead and write the audit trail atomically
    const [updatedLead] = await prisma.$transaction([
      prisma.lead.update({
        where: { id: data.id },
        data: {
          name: data.name !== undefined ? data.name : undefined,
          companyName: data.companyName !== undefined ? data.companyName : undefined,
          email: data.email !== undefined ? data.email : undefined,
          phone: formattedPhone !== undefined ? formattedPhone : undefined,
          normalizedPhone: normalizedPhone !== undefined ? normalizedPhone : undefined,
          source: data.source !== undefined ? data.source : undefined,
          status: data.status !== undefined ? data.status : undefined,
          estimatedValue:
            data.estimatedValue !== undefined ? data.estimatedValue : undefined,
          qualification:
            data.qualification !== undefined ? data.qualification : undefined,
          ownerId: data.ownerId !== undefined ? data.ownerId : undefined,
          notes: data.notes !== undefined ? data.notes : undefined,
          campaign: data.campaign !== undefined ? data.campaign : undefined,
          externalLeadId:
            data.externalLeadId !== undefined ? data.externalLeadId : undefined,
          utmSource: data.utmSource !== undefined ? data.utmSource : undefined,
          utmMedium: data.utmMedium !== undefined ? data.utmMedium : undefined,
          utmCampaign: data.utmCampaign !== undefined ? data.utmCampaign : undefined,
          aiSummary: data.aiSummary !== undefined ? data.aiSummary : undefined,
          clientId:
            !user!.isClientUser && data.clientId !== undefined ? data.clientId : undefined,
        },
        include: {
          owner: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      ...auditOperations,
    ]);

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error("PUT /api/leads error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar prospecto." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID es requerido." },
        { status: 400 }
      );
    }

    const existing = await prisma.lead.findFirst({
      where: { id, organizationId: user!.organizationId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Prospecto no encontrado en su organización." },
        { status: 404 }
      );
    }

    // Logical deletion
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "lead_deleted",
        entityType: "Lead",
        entityId: lead.id,
        detailsJson: JSON.stringify({ name: lead.name, email: lead.email }),
      },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error("DELETE /api/leads error:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar prospecto." },
      { status: 500 }
    );
  }
}
