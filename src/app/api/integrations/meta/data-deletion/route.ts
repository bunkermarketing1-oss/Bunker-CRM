import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * Endpoint de devolución de llamada para eliminación de datos de usuario de Meta (Data Deletion Callback).
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

function parseSignedRequest(signedRequest: string, secret: string): { user_id?: string } | null {
  try {
    const [encodedSig, payload] = signedRequest.split(".", 2);
    if (!encodedSig || !payload) return null;

    const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const expectedSig = createHmac("sha256", secret).update(payload).digest();

    if (sig.length !== expectedSig.length || !sig.equals(expectedSig)) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return data;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL("/data-deletion", req.url);
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  try {
    let signedRequest = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      signedRequest = (formData.get("signed_request") as string) || "";
    } else {
      const body = await req.json().catch(() => ({}));
      signedRequest = body.signed_request || "";
    }

    const appSecret = process.env.META_APP_SECRET || "";
    const data = appSecret ? parseSignedRequest(signedRequest, appSecret) : null;
    const userId = data?.user_id || "unknown";

    const confirmationCode = `DEL-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const trackingUrl = `${baseUrl.replace(/\/$/, "")}/data-deletion?ticket=${confirmationCode}&user=${userId}`;

    return NextResponse.json({
      url: trackingUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error("Meta data deletion callback error:", error);
    const confirmationCode = `DEL-${Date.now().toString(36).toUpperCase()}`;
    return NextResponse.json({
      url: `${(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/data-deletion`,
      confirmation_code: confirmationCode,
    });
  }
}
