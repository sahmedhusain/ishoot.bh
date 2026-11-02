"use client";
// Notification sounds, synthesised in the browser so no audio files are shipped (docs/adr/0012). Web Audio is used
// where it exists; otherwise the same tones are rendered to a WAV once and played with an <audio> element. Browsers
// allow sound only after the person interacted with the page, so unlockNotificationSound() runs on the first click or
// key press.

export type SoundName = "chime" | "ping" | "pop" | "bell" | "alert";
type Tone = { freq: number; at: number; dur: number; type: OscillatorType; gain: number };

/** Each sound as a few tones: frequency (Hz), start and length (s). */
const SOUNDS: Record<SoundName, Tone[]> = {
  chime: [
    { freq: 880, at: 0, dur: 0.35, type: "sine", gain: 0.6 },
    { freq: 1318.5, at: 0.12, dur: 0.5, type: "sine", gain: 0.5 },
  ],
  ping: [{ freq: 1567.98, at: 0, dur: 0.28, type: "sine", gain: 0.6 }],
  pop: [
    { freq: 520, at: 0, dur: 0.09, type: "triangle", gain: 0.7 },
    { freq: 780, at: 0.05, dur: 0.1, type: "triangle", gain: 0.4 },
  ],
  bell: [
    { freq: 659.25, at: 0, dur: 1.1, type: "sine", gain: 0.55 },
    { freq: 1318.5, at: 0, dur: 0.8, type: "sine", gain: 0.2 },
    { freq: 1975.5, at: 0, dur: 0.5, type: "sine", gain: 0.1 },
  ],
  alert: [
    { freq: 987.77, at: 0, dur: 0.16, type: "square", gain: 0.25 },
    { freq: 987.77, at: 0.22, dur: 0.16, type: "square", gain: 0.25 },
    { freq: 1318.5, at: 0.44, dur: 0.24, type: "square", gain: 0.25 },
  ],
};

type AudioContextClass = typeof AudioContext;
let context: AudioContext | null = null;
const wavCache = new Map<SoundName, string>();

function audioContextClass(): AudioContextClass | null {
  if (typeof window === "undefined") return null;
  return (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext) ?? null;
}

/** Lets later sounds play: call from a user gesture. Safe to call often. */
export function unlockNotificationSound() {
  const Ctx = audioContextClass();
  if (!Ctx) return;
  context ??= new Ctx();
  if (context.state === "suspended") void context.resume();
}

/** Installs one-time listeners that unlock sound on the first interaction. */
export function installSoundUnlock() {
  if (typeof window === "undefined") return () => {};
  const unlock = () => {
    unlockNotificationSound();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  return unlock;
}

function playWebAudio(ctx: AudioContext, tones: Tone[], volume: number) {
  const start = ctx.currentTime + 0.01;
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.value = tone.freq;
    const t0 = start + tone.at;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(tone.gain, t0 + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.dur);
    osc.connect(env).connect(master);
    osc.start(t0);
    osc.stop(t0 + tone.dur + 0.02);
  }
}

/** Renders tones to a 16-bit mono WAV (for browsers without Web Audio). */
function renderWav(tones: Tone[]): string {
  const rate = 22050;
  const length = Math.ceil(rate * Math.max(...tones.map((t) => t.at + t.dur + 0.02)));
  const samples = new Float32Array(length);
  for (const tone of tones) {
    const from = Math.floor(tone.at * rate);
    const count = Math.floor(tone.dur * rate);
    for (let i = 0; i < count && from + i < length; i++) {
      const t = i / rate;
      const phase = 2 * Math.PI * tone.freq * t;
      const wave =
        tone.type === "square" ? Math.sign(Math.sin(phase)) : tone.type === "triangle" ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : Math.sin(phase);
      const envelope = Math.min(1, t / 0.012) * Math.exp((-5 * t) / tone.dur);
      samples[from + i] += wave * envelope * tone.gain;
    }
  }
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
  text(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

/** Plays a notification sound at volume 0–100. Resolves false when the browser refused (no interaction yet). */
export async function playNotificationSound(name: string, volume = 70): Promise<boolean> {
  const sound = (name in SOUNDS ? name : "chime") as SoundName;
  const level = Math.max(0, Math.min(100, volume)) / 100;
  if (level === 0) return true;
  const Ctx = audioContextClass();
  if (Ctx) {
    context ??= new Ctx();
    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return false;
      }
    }
    if (context.state !== "running") return false;
    playWebAudio(context, SOUNDS[sound], level);
    return true;
  }
  if (typeof Audio === "undefined") return false;
  let url = wavCache.get(sound);
  if (!url) {
    url = renderWav(SOUNDS[sound]);
    wavCache.set(sound, url);
  }
  const audio = new Audio(url);
  audio.volume = level;
  try {
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

export const NOTIFICATION_SOUND_NAMES = Object.keys(SOUNDS) as SoundName[];
