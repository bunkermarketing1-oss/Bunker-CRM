import { REMEMBERED_EMAIL_KEY } from "@/lib/constants/auth";

// Credential Management API: solo Chrome y Edge la ofrecen y TypeScript no la incluye en sus tipos.
type PasswordCredentialConstructor = new (data: { id: string; password: string; name?: string }) => Credential;

export function loadRememberedEmail(): string {
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Recuerda el acceso tras un login correcto.
 * - El correo se guarda en el navegador para precargarlo.
 * - La contraseña NUNCA se guarda aquí: se le entrega al administrador de contraseñas del navegador, que la cifra
 *   y la protege con la clave del dispositivo. Como el login se envía sin recargar la página, el navegador no lo
 *   detecta solo y hay que avisarle explícitamente para que ofrezca guardarla.
 */
export async function rememberLogin(email: string, password: string, remember: boolean): Promise<void> {
  try {
    if (!remember) {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      return;
    }
    window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);

    const PasswordCredential = (window as unknown as { PasswordCredential?: PasswordCredentialConstructor }).PasswordCredential;
    if (PasswordCredential && navigator.credentials) {
      await navigator.credentials.store(new PasswordCredential({ id: email, password, name: email }));
    }
  } catch {
    // Recordar es una comodidad: si el navegador lo bloquea, el inicio de sesión no debe fallar.
  }
}
