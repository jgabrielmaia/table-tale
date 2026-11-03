export type SoundName = 'ambient' | 'select' | 'charge' | 'impact';

// Placeholder hook: point a name at a real file to replace its synthesized stand-in.
const SOUND_FILES: Partial<Record<SoundName, string>> = {};

export interface FateAudio {
  setEnabled(on: boolean): void;
  play(name: SoundName): void;
  stop(name: SoundName): void;
  dispose(): void;
}

type Handle = { stop: () => void };

export function createFateAudio(): FateAudio {
  let ctx: AudioContext | null = null;
  let enabled = false;
  const active = new Map<SoundName, Handle>();

  const getCtx = () => {
    if (!ctx || ctx.state === 'closed') {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  };

  const envelope = (c: AudioContext, peak: number, attack: number, total: number) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(peak, c.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + total);
    g.connect(c.destination);
    return g;
  };

  const fadeOut = (c: AudioContext, g: GainNode, nodes: AudioScheduledSourceNode[], secs: number): Handle => ({
    stop: () => {
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + secs);
      nodes.forEach((n) => n.stop(c.currentTime + secs + 0.05));
    },
  });

  const synth: Record<SoundName, (c: AudioContext) => Handle> = {
    ambient: (c) => {
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 3);
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      filter.connect(g).connect(c.destination);
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      lfo.frequency.value = 0.12;
      lfoGain.gain.value = 160;
      lfo.connect(lfoGain).connect(filter.frequency);
      const oscs = [55, 82.4, 110.6].map((f) => {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.connect(filter);
        o.start();
        return o;
      });
      lfo.start();
      return fadeOut(c, g, [...oscs, lfo], 1.5);
    },
    select: (c) => {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(520, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(1040, c.currentTime + 0.2);
      o.connect(envelope(c, 0.12, 0.02, 0.35));
      o.start();
      o.stop(c.currentTime + 0.4);
      return { stop: () => undefined };
    },
    charge: (c) => {
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.07, c.currentTime + 2.4);
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, c.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3200, c.currentTime + 2.6);
      filter.connect(g).connect(c.destination);
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(70, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(720, c.currentTime + 2.6);
      o.connect(filter);
      o.start();
      return fadeOut(c, g, [o], 0.15);
    },
    impact: (c) => {
      const len = Math.floor(c.sampleRate * 1.2);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      const noise = c.createBufferSource();
      noise.buffer = buf;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      noise.connect(lp).connect(envelope(c, 0.35, 0.01, 1.1));
      noise.start();
      const boom = c.createOscillator();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(110, c.currentTime);
      boom.frequency.exponentialRampToValueAtTime(32, c.currentTime + 0.9);
      boom.connect(envelope(c, 0.6, 0.01, 1.1));
      boom.start();
      boom.stop(c.currentTime + 1.2);
      return { stop: () => undefined };
    },
  };

  const playFile = (name: SoundName, url: string): Handle => {
    const el = new Audio(url);
    el.loop = name === 'ambient';
    el.volume = name === 'ambient' ? 0.25 : 0.7;
    void el.play().catch(() => undefined);
    return { stop: () => el.pause() };
  };

  const stop = (name: SoundName) => {
    active.get(name)?.stop();
    active.delete(name);
  };

  return {
    setEnabled(on) {
      enabled = on;
      if (on) getCtx();
      else [...active.keys()].forEach(stop);
    },
    play(name) {
      if (!enabled) return;
      stop(name);
      const url = SOUND_FILES[name];
      const c = url ? null : getCtx();
      if (url) active.set(name, playFile(name, url));
      else if (c) active.set(name, synth[name](c));
    },
    stop,
    dispose() {
      [...active.keys()].forEach(stop);
      void ctx?.close();
      ctx = null;
    },
  };
}
