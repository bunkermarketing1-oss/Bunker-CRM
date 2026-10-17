import { NextResponse } from "next/server";

// Respuestas compartidas por los webhooks de Twilio (no es una ruta: no se llama route.ts).

export const twimlResponseOf = (xml: string) => new NextResponse(xml, { status: 200, headers: { "Content-Type": "text/xml" } });

export const invalidTwilioSignature = () => NextResponse.json({ success: false, error: "Firma inválida." }, { status: 403 });
