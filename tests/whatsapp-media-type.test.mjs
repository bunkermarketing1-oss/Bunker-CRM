import test from "node:test";
import assert from "node:assert/strict";
import { whatsAppMediaTypeFromUrl, filenameFromUrl } from "../src/lib/integrations/whatsapp.ts";

test("una nota de voz se envía como audio y no como imagen, porque WhatsApp la rechazaría", () => {
  assert.equal(whatsAppMediaTypeFromUrl("https://x.supabase.co/storage/v1/object/public/inbox-media/o/nota-de-voz-1.mp3"), "audio");
  assert.equal(whatsAppMediaTypeFromUrl("https://x.co/a/nota.ogg?t=1"), "audio");
  assert.equal(whatsAppMediaTypeFromUrl("https://x.co/a/nota.m4a"), "audio");
});

test("fotos, videos y documentos se envían con su tipo correcto", () => {
  assert.equal(whatsAppMediaTypeFromUrl("https://x.co/foto.JPG"), "image");
  assert.equal(whatsAppMediaTypeFromUrl("https://x.co/video.mp4"), "video");
  assert.equal(whatsAppMediaTypeFromUrl("https://x.co/cotizacion.pdf"), "document");
  assert.equal(whatsAppMediaTypeFromUrl("https://x.co/archivo-sin-extension"), "document");
});

test("el nombre del archivo se toma de la URL y decodifica los espacios", () => {
  assert.equal(filenameFromUrl("https://x.co/a/Cotizaci%C3%B3n%20Regal.pdf"), "Cotización Regal.pdf");
  assert.equal(filenameFromUrl("no es una url"), undefined);
});
