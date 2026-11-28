const BELL_HIGH_HZ = 2093;
const BELL_LOW_HZ = 1760;
const STRIKES_PER_RING = 6;
const STRIKE_GAP_S = 0.065;
const RING_COUNT = 2;
const RING_PAUSE_S = 0.2;
const CLOSE_AFTER_MS = 2000;

/**
 * Sonido de despertador de caricatura, sin archivos de audio: un "boing" de salto y dos ráfagas de campanilla.
 * Si el navegador aún no permitió audio (nadie ha tocado la página) simplemente no suena.
 */
export function playAlarmClockSound(): void {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const start = ctx.currentTime;

    // "Boing": tono que sube rápido, como el resorte de un salto.
    const boing = ctx.createOscillator();
    const boingGain = ctx.createGain();
    boing.type = "sine";
    boing.frequency.setValueAtTime(180, start);
    boing.frequency.exponentialRampToValueAtTime(560, start + 0.18);
    boingGain.gain.setValueAtTime(0.2, start);
    boingGain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
    boing.connect(boingGain).connect(ctx.destination);
    boing.start(start);
    boing.stop(start + 0.22);

    // Campanilla: golpes rápidos que alternan dos tonos agudos, como el martillo entre las dos campanas.
    const ringLength = STRIKES_PER_RING * STRIKE_GAP_S;
    for (let ring = 0; ring < RING_COUNT; ring++) {
      for (let strike = 0; strike < STRIKES_PER_RING; strike++) {
        const at = start + 0.24 + ring * (ringLength + RING_PAUSE_S) + strike * STRIKE_GAP_S;
        const bell = ctx.createOscillator();
        const gain = ctx.createGain();
        bell.type = "triangle";
        bell.frequency.setValueAtTime(strike % 2 === 0 ? BELL_HIGH_HZ : BELL_LOW_HZ, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.16, at + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, at + STRIKE_GAP_S * 0.95);
        bell.connect(gain).connect(ctx.destination);
        bell.start(at);
        bell.stop(at + STRIKE_GAP_S);
      }
    }

    // Cada contexto de audio ocupa recursos del navegador: se libera al terminar.
    setTimeout(() => void ctx.close().catch(() => {}), CLOSE_AFTER_MS);
  } catch {
    // Silencioso: algunos navegadores bloquean el audio hasta la primera interacción.
  }
}
