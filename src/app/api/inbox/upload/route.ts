import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";
import { INBOX_MEDIA_BUCKET } from "@/lib/constants/storage";

export const dynamic = "force-dynamic";

// Extensiones ejecutables o de riesgo bloqueadas por seguridad
const DISALLOWED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "msi", "dll", "scr", "vbs", "ps1", "com", "jar", "apk"
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const STORAGE_STATUS = { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, PAYLOAD_TOO_LARGE: 413 } as const;

/** Mensaje para el usuario según el estado que devuelve Supabase Storage. */
function storageUploadErrorMessage(status: number): string {
  if (status === STORAGE_STATUS.PAYLOAD_TOO_LARGE) {
    return "El archivo es demasiado pesado para subirlo. Prueba con uno más pequeño.";
  }
  if (status === STORAGE_STATUS.UNAUTHORIZED || status === STORAGE_STATUS.FORBIDDEN) {
    return "El servidor no tiene permiso para guardar archivos. Avisa a soporte: la llave de Supabase del servidor es inválida.";
  }
  if (status === STORAGE_STATUS.NOT_FOUND) {
    return "No existe el almacenamiento de archivos del servidor. Avisa a soporte.";
  }
  return "Error al guardar el archivo en el servidor.";
}

/**
 * POST /api/inbox/upload
 * Sube una fotografía, documento (PDF, Word, Excel) o archivo a Supabase Storage (bucket público `inbox-media`)
 * para compartirlo a través de Facebook Messenger, Instagram Direct o SMS/MMS.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { success: false, error: "Datos del formulario no válidos." },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No se seleccionó ningún archivo." },
        { status: 400 }
      );
    }

    const rawExt = file.name.split(".").pop()?.toLowerCase() || "";
    const cleanExt = rawExt.replace(/[^a-z0-9]/g, "").slice(0, 8);

    if (DISALLOWED_EXTENSIONS.has(cleanExt)) {
      return NextResponse.json(
        {
          success: false,
          error: "Por razones de seguridad, no se permiten archivos ejecutables o programas.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "El archivo supera el tamaño máximo permitido de 25 MB." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = cleanExt ? `.${cleanExt}` : "";
    const fileName = `${user!.organizationId}/${Date.now()}_${randomUUID().slice(0, 8)}${ext}`;

    const contentType = file.type || "application/octet-stream";

    const { error: uploadError } = await supabaseAdmin.storage
      .from(INBOX_MEDIA_BUCKET)
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      // El statusCode distingue "archivo demasiado grande" de "llave inválida" o "bucket
      // inexistente"; sin él todos los fallos se ven igual en pantalla y en el log.
      const storageStatus = Number((uploadError as { statusCode?: string | number }).statusCode);
      console.error("[INBOX_UPLOAD] Error uploading to Supabase Storage:", {
        statusCode: storageStatus || null,
        message: uploadError.message,
        sizeBytes: file.size,
        contentType,
      });
      return NextResponse.json(
        { success: false, error: storageUploadErrorMessage(storageStatus) },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(INBOX_MEDIA_BUCKET)
      .getPublicUrl(fileName);

    const isImage = contentType.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(cleanExt);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: contentType,
      isImage,
    });
  } catch (error) {
    console.error("[INBOX_UPLOAD] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Error al procesar el archivo.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
