/**
 * Helper puro para resolución de URLs y sanitización de hosts.
 * No depende de React ni de next/server (conforme a AGENTS.md).
 */

export interface RequestHeadersLike {
  get(name: string): string | null;
}

export interface RequestLike {
  headers: RequestHeadersLike;
  nextUrl?: {
    host?: string;
    protocol?: string;
    searchParams?: {
      get(name: string): string | null;
    };
  };
}

/**
 * Sanitiza cualquier host o URL reemplazando "0.0.0.0" por "localhost".
 * Meta OAuth y los navegadores modernos (Chromium) bloquean o marcan como ERR_ADDRESS_INVALID
 * cualquier navegación directa a 0.0.0.0.
 */
export function sanitizeHost(host: string): string {
  return host.replace(/\b0\.0\.0\.0\b/g, "localhost");
}

/**
 * Determina si una URL base debe usar cookies seguras (`Secure`).
 * En localhost o 127.0.0.1 sobre HTTP, el flag `Secure` impide que el navegador almacene
 * o envíe cookies (como el state OAuth), provocando "Solicitud OAuth inválida o expirada".
 */
export function isSecureConnection(baseUrl: string): boolean {
  if (!baseUrl.startsWith("https://")) return false;
  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) return false;
  return true;
}

/**
 * Extrae de forma segura el origen de una URL string si es válida y no es 0.0.0.0.
 */
function extractValidOrigin(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if ((parsed.protocol === "http:" || parsed.protocol === "https:") && !parsed.host.includes("0.0.0.0")) {
      return parsed.origin;
    }
  } catch {
    // Si no es URL completa válida, ignorar
  }
  return null;
}

/**
 * Resuelve la URL base pública y canónica de Bunker CRM.
 * Prioriza el dominio real de producción en todo momento:
 * 1. NEXT_PUBLIC_APP_URL si es un dominio real (ej. https://crm.179.236.72.72.sslip.io)
 * 2. Parámetro `origin` de la query string (enviado desde el navegador del usuario)
 * 3. Cabecera `x-forwarded-host` + `x-forwarded-proto` (enviada por Dokploy / Traefik / Nginx)
 * 4. Cabecera `referer` o `origin` (el origen exacto desde el que el usuario hizo clic)
 * 5. Host del request
 * 6. Fallback seguro
 */
export function resolveAppBaseUrl(req?: RequestLike | null): string {
  // 1. Variable de entorno de producción (máxima prioridad si es dominio real)
  const rawEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const envUrl = rawEnv ? sanitizeHost(rawEnv) : null;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/$/, "");
  }

  // 2. Parámetro explícito de query string si existe
  if (req?.nextUrl?.searchParams) {
    const queryOrigin = extractValidOrigin(req.nextUrl.searchParams.get("origin"));
    if (queryOrigin) {
      return queryOrigin;
    }
  }

  if (req) {
    // 3. Proxy inverso de producción (Dokploy / Traefik / Nginx)
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto =
      req.headers.get("x-forwarded-proto") || (req.headers.get("x-forwarded-ssl") === "on" ? "https" : null);

    if (forwardedHost) {
      // Traefik o Nginx pueden concatenar hosts separados por coma
      const primaryHost = forwardedHost.split(",")[0].trim();
      if (primaryHost && !primaryHost.includes("0.0.0.0")) {
        const proto = forwardedProto || (primaryHost.includes("localhost") ? "http" : "https");
        return `${proto}://${primaryHost}`.replace(/\/$/, "");
      }
    }

    // 4. Cabeceras referer u origin del navegador del usuario
    const refererOrigin = extractValidOrigin(req.headers.get("referer"));
    if (refererOrigin) {
      return refererOrigin;
    }

    const originHeader = extractValidOrigin(req.headers.get("origin"));
    if (originHeader) {
      return originHeader;
    }

    // 5. Host directo de la petición
    let host = req.headers.get("host") || req.nextUrl?.host;
    const proto = forwardedProto || (req.nextUrl?.protocol ? req.nextUrl.protocol.replace(":", "") : null);

    if (host) {
      host = sanitizeHost(host);
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
      const scheme = isLocal ? (proto === "https" && req.headers.get("x-forwarded-proto") === "https" ? "https" : "http") : (proto || "https");
      return `${scheme}://${host}`.replace(/\/$/, "");
    }
  }

  // 6. Fallback final
  return (envUrl || "http://localhost:3000").replace(/\/$/, "");
}
