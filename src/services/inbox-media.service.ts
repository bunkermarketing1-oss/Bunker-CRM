import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { INBOX_MEDIA_BUCKET } from "@/lib/constants/storage";

const EXTENSION_BY_MIME: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

/** La extensión importa: la bandeja decide si muestra un reproductor o una imagen según la terminación del enlace. */
function extensionForMime(contentType: string): string {
  const mime = contentType.split(";")[0].trim().toLowerCase();
  return EXTENSION_BY_MIME[mime] || mime.split("/")[1]?.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
}

/** Guarda un archivo recibido por un canal externo y devuelve su URL pública permanente (o null si falla). */
export async function storeInboxMedia(params: {
  organizationId: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const mime = params.contentType.split(";")[0].trim().toLowerCase();
    const path = `${params.organizationId}/inbound/${Date.now()}_${randomUUID().slice(0, 8)}.${extensionForMime(params.contentType)}`;

    const { error } = await supabaseAdmin.storage
      .from(INBOX_MEDIA_BUCKET)
      .upload(path, params.buffer, { contentType: mime || "application/octet-stream", upsert: false });
    if (error) {
      console.error("[INBOX_MEDIA] No se pudo guardar el archivo recibido:", error.message);
      return null;
    }
    return supabaseAdmin.storage.from(INBOX_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (error) {
    console.error("[INBOX_MEDIA] Error inesperado:", error instanceof Error ? error.message : error);
    return null;
  }
}
