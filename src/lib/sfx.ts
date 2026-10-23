"use client";

let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(freqs: number[], step = 0.06, type: OscillatorType = "square", gain = 0.06) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  freqs.forEach((f, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t0 + i * step);
    g.gain.setValueAtTime(gain, t0 + i * step);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * step);
    osc.connect(g).connect(ac.destination);
    osc.start(t0 + i * step);
    osc.stop(t0 + (i + 1) * step);
  });
}

/** Tiny generated 8-bit SFX — no audio files needed. */
export const sfx = {
  hop: () => blip([330, 440, 660], 0.05),
  open: () => blip([523, 784], 0.07),
  close: () => blip([523, 392], 0.06),
  click: () => blip([880], 0.04),
  coin: () => blip([988, 1319], 0.08, "square", 0.05),
};
