/**
 * Utilidad para gestionar fotos de perfil reales para prospectos y usuarios.
 * - Si el prospecto cuenta con una foto real verificada (de Facebook, Instagram, WhatsApp o CDN), la retorna.
 * - Si no tiene foto real, retorna `null` para que los componentes muestren sus iniciales
 *   y el distintivo oficial del canal (WhatsApp, Facebook, Instagram), evitando imágenes ficticias.
 */
export function getLeadAvatarUrl(
  _name?: string | null,
  customAvatarUrl?: string | null
): string | null {
  if (
    customAvatarUrl &&
    typeof customAvatarUrl === "string" &&
    customAvatarUrl.trim().length > 0 &&
    !customAvatarUrl.includes("randomuser.me")
  ) {
    return customAvatarUrl.trim();
  }
  return null;
}
