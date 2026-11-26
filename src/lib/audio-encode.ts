const MP3_BITRATE_KBPS = 64;
// El codificador procesa el audio por bloques de 1152 muestras (un "frame" de MP3).
const MP3_FRAME_SAMPLES = 1152;

function mixToMono(buffer: AudioBuffer): Float32Array {
  const mono = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
  }
  return mono;
}

function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return out;
}

/**
 * Convierte audio grabado por el navegador a MP3.
 * Chrome graba en webm/opus, que WhatsApp no acepta; MP3 sí, y suena igual en cualquier celular.
 */
export async function blobToMp3(blob: Blob): Promise<Blob> {
  // Carga perezosa: el codificador solo pesa cuando alguien graba una nota de voz.
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
    const samples = toInt16(mixToMono(decoded));
    const encoder = new Mp3Encoder(1, decoded.sampleRate, MP3_BITRATE_KBPS);

    const chunks: Uint8Array[] = [];
    for (let i = 0; i < samples.length; i += MP3_FRAME_SAMPLES) {
      const encoded = encoder.encodeBuffer(samples.subarray(i, i + MP3_FRAME_SAMPLES));
      if (encoded.length > 0) chunks.push(new Uint8Array(encoded));
    }
    const tail = encoder.flush();
    if (tail.length > 0) chunks.push(new Uint8Array(tail));

    return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
  } finally {
    await audioContext.close();
  }
}
