import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    const integration = await prisma.integration.findUnique({
      where: { id },
    });

    if (!integration) {
      return NextResponse.json({ success: false, error: "Integración no encontrada" }, { status: 404 });
    }

    if (integration.status !== "connected") {
      return NextResponse.json({
        success: false,
        error: `No se puede sincronizar: La integración ${integration.name} no está conectada o le faltan credenciales activas.`,
      }, { status: 400 });
    }

    const updated = await prisma.integration.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        errorMessage: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: integration.organizationId,
        action: "integration_synced",
        entityType: "Integration",
        entityId: integration.id,
        detailsJson: JSON.stringify({ provider: integration.provider, timestamp: new Date() }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sincronización completada exitosamente con ${integration.name}.`,
      lastSyncAt: updated.lastSyncAt,
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
