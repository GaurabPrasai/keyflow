import { useCallback, useEffect, useRef } from "react";

/**
 * Zero-asset typing sound. Six buffers are synthesised per pack on the first
 * keydown (four key variants + two softer error taps): a filtered noise burst
 * with an exponential envelope plus a decaying sine body. Playback is one
 * BufferSource per key inside the keydown handler — nothing is awaited.
 */

const KEY_VARIANTS = 4;
const ERROR_VARIANTS = 2;

const PACKS = {
  soft: {
    key: { dur: 0.12, cutoff: 1200, noise: 0.34, sine: 190, sineDecay: 34 },
    error: { dur: 0.1, cutoff: 700, noise: 0.24, sine: 116, sineDecay: 26 },
  },
  clicky: {
    key: { dur: 0.06, cutoff: 3200, noise: 0.5, sine: 340, sineDecay: 80 },
    error: { dur: 0.08, cutoff: 900, noise: 0.3, sine: 150, sineDecay: 40 },
  },
  thock: {
    key: { dur: 0.15, cutoff: 900, noise: 0.3, sine: 140, sineDecay: 20 },
    error: { dur: 0.13, cutoff: 620, noise: 0.22, sine: 104, sineDecay: 18 },
  },
};

function synthesize(context, spec) {
  const rate = context.sampleRate;
  const length = Math.max(1, Math.floor(rate * spec.dur));
  const buffer = context.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  const attack = Math.max(1, Math.floor(rate * 0.0015));
  const jitter = 0.86 + Math.random() * 0.28;
  const cutoff = spec.cutoff * jitter;
  const sine = spec.sine * (0.96 + Math.random() * 0.08);
  const coefficient = 1 - Math.exp((-2 * Math.PI * cutoff) / rate);
  const noiseDecay = 6 / spec.dur;
  const gain = 0.88 + Math.random() * 0.24;
  let lowpass = 0;

  for (let i = 0; i < length; i += 1) {
    const time = i / rate;
    const white = Math.random() * 2 - 1;
    lowpass += (white - lowpass) * coefficient;
    let sample = lowpass * Math.exp(-time * noiseDecay) * spec.noise;
    sample += Math.sin(2 * Math.PI * sine * time) * Math.exp(-time * spec.sineDecay) * 0.5;
    if (i < attack) sample *= i / attack;
    data[i] = sample * gain * 0.6;
  }
  return buffer;
}

function buildPack(context, pack) {
  const spec = PACKS[pack] || PACKS.soft;
  const keys = [];
  const errors = [];
  for (let i = 0; i < KEY_VARIANTS; i += 1) keys.push(synthesize(context, spec.key));
  for (let i = 0; i < ERROR_VARIANTS; i += 1) errors.push(synthesize(context, spec.error));
  return { keys, errors };
}

export default function useTypingSound({ pack, volume }) {
  const stateRef = useRef({ context: null, gain: null, pack: null, buffers: null, level: 0, lastResume: 0 });
  const settingsRef = useRef({ pack, volume });
  settingsRef.current = { pack, volume };

  const ensure = useCallback(() => {
    const { pack: current, volume: level } = settingsRef.current;
    if (current === "off") return null;
    const state = stateRef.current;
    if (!state.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      state.context = new AudioContextClass();
      state.gain = state.context.createGain();
      state.gain.gain.value = level;
      state.level = level;
      state.gain.connect(state.context.destination);
    }
    if (state.pack !== current || !state.buffers) {
      state.buffers = buildPack(state.context, current);
      state.pack = current;
    }
    if (state.level !== level) {
      state.gain.gain.value = level;
      state.level = level;
    }
    // resume() is only meaningful after a gesture and is expensive to call on
    // every key, so it is throttled to once a second.
    const now = performance.now();
    if (state.context.state === "suspended" && now - state.lastResume > 1_000) {
      state.lastResume = now;
      state.context.resume().catch(() => {});
    }
    return state;
  }, []);

  const play = useCallback(
    (correct) => {
      const { pack: current, volume: level } = settingsRef.current;
      if (current === "off" || level <= 0) return;
      const state = ensure();
      if (!state || !state.buffers) return;
      const list = correct ? state.buffers.keys : state.buffers.errors;
      const source = state.context.createBufferSource();
      source.buffer = list[(Math.random() * list.length) | 0];
      source.playbackRate.value = 0.96 + Math.random() * 0.08;
      source.connect(state.gain);
      source.start();
    },
    [ensure]
  );

  // Synthesise ahead of the first keystroke while the main thread is idle.
  useEffect(() => {
    if (settingsRef.current.pack === "off") return undefined;
    const id =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(() => ensure(), { timeout: 3_000 })
        : window.setTimeout(() => ensure(), 1_200);
    return () => {
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [ensure, pack]);

  useEffect(
    () => () => {
      const state = stateRef.current;
      if (state.context) state.context.close().catch(() => {});
      state.context = null;
      state.gain = null;
      state.buffers = null;
      state.pack = null;
    },
    []
  );

  return play;
}
