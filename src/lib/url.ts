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
 * Resuelve la URL base pública y canónica de Bunker CRM.
 * Compatible con:
 * - Desarrollo local (`localhost:3000` o `0.0.0.0:3000`)
 * - Deployments en Dokploy / Docker / Proxies inversos (Nginx, Traefik, Nixpacks)
 * - Meta OAuth (requiere URLs válidas y registradas, nunca 0.0.0.0)
 */
export function resolveAppBaseUrl(req?: RequestLike | null): string {
  let host: string | null = null;
  let proto: string | null = null;

  if (req) {
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto =
      req.headers.get("x-forwarded-proto") || (req.headers.get("x-forwarded-ssl") === "on" ? "https" : null);

    host = forwardedHost || req.headers.get("host");

    if (!host && req.nextUrl?.host) {
      host = req.nextUrl.host;
    }

    proto = forwardedProto;
    if (!proto && req.nextUrl?.protocol) {
      proto = req.nextUrl.protocol.replace(":", "");
    }
  }

  // 1. Si hay un host detectado en la petición, sanitizar 0.0.0.0
  if (host) {
    host = sanitizeHost(host);
  }

  // 2. Revisar variable de entorno NEXT_PUBLIC_APP_URL
  const rawEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const envUrl = rawEnv ? sanitizeHost(rawEnv) : null;

  // Si envUrl es un dominio de producción real (no localhost), tiene máxima prioridad
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/$/, "");
  }

  // 3. Si tenemos información del request HTTP
  if (host) {
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    // En entornos locales forzar http a menos que un proxy certifique https explícito
    const scheme = isLocal ? (proto === "https" && req?.headers.get("x-forwarded-proto") === "https" ? "https" : "http") : (proto || "https");
    return `${scheme}://${host}`.replace(/\/$/, "");
  }

  // 4. Fallback si no hay request ni dominio de producción
  return (envUrl || "http://localhost:3000").replace(/\/$/, "");
}
