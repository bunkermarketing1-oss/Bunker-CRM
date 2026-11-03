/**
 * Síntesis de tonos telefónicos DTMF (ITU-T Q.23) mediante Web Audio API.
 * No requiere archivos de audio externos y reproduce el par de frecuencias exacto de cada tecla.
 */

const DTMF_FREQUENCIES: Record<string, readonly [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "+": [941, 1336],
  "#": [941, 1477],
};

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Reproduce el tono DTMF correspondiente a un dígito (`0-9`, `*`, `#`, `+`).
 */
export function playDtmfTone(digit: string, durationMs = 120): void {
  const pair = DTMF_FREQUENCIES[digit];
  if (!pair) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const durationSec = Math.max(0.06, durationMs / 1000);

    const gain = ctx.createGain();
    // Envolvente suave estilo iOS para evitar chasquidos al iniciar o cortar la onda.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.008);
    gain.gain.setValueAtTime(0.14, now + durationSec - 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    gain.connect(ctx.destination);

    const [lowFreq, highFreq] = pair;
    const oscLow = ctx.createOscillator();
    const oscHigh = ctx.createOscillator();

    oscLow.type = "sine";
    oscHigh.type = "sine";
    oscLow.frequency.setValueAtTime(lowFreq, now);
    oscHigh.frequency.setValueAtTime(highFreq, now);

    oscLow.connect(gain);
    oscHigh.connect(gain);

    oscLow.start(now);
    oscHigh.start(now);
    oscLow.stop(now + durationSec + 0.01);
    oscHigh.stop(now + durationSec + 0.01);
  } catch {
    // Si el navegador bloquea el audio antes de interacción o no soporta Web Audio, se ignora.
  }
}

/**
 * Reproduce un pulso corto y grave al borrar un dígito en el teclado.
 */
export function playBackspaceTone(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.05);
    osc.connect(gain);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    // Ignorar si el navegador bloquea el contexto de audio.
  }
}

