// All audio is synthesized locally: no downloads, autoplay, or background music.
export class Sound {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.lastCrinkle = 0;
  }
  unlock() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.65 : 0;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.ctx.createBuffer(
        1,
        this.ctx.sampleRate * 2,
        this.ctx.sampleRate,
      );
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.master)
      this.master.gain.setTargetAtTime(
        this.enabled ? 0.65 : 0,
        this.ctx.currentTime,
        0.03,
      );
    return this.enabled;
  }
  noise(duration, volume, frequency, delay = 0, q = 1) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime + delay;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now, Math.random());
    source.stop(now + duration + 0.02);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  tone(frequency, duration, volume, delay = 0, type = "sine") {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(
      frequency * 0.995,
      now + duration,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  crinkle(speed = 0.5) {
    if (!this.ctx || this.ctx.currentTime - this.lastCrinkle < 0.035) return;
    this.lastCrinkle = this.ctx.currentTime;
    this.noise(
      0.055 + Math.random() * 0.075,
      0.12 + speed * 0.22,
      1700 + Math.random() * 4000,
      0,
      0.55,
    );
    this.noise(0.025, 0.1, 7500, 0.015, 1.8);
  }
  tear() {
    for (let i = 0; i < 9; i++)
      this.noise(
        0.04 + i * 0.008,
        0.25 * (1 - i / 12),
        1800 + Math.random() * 3500,
        i * 0.027,
        0.6,
      );
    this.tone(100, 0.18, 0.12);
  }
  slide() {
    this.noise(0.2, 0.22, 1400, 0, 0.45);
    this.noise(0.09, 0.13, 4800, 0.08, 0.7);
  }
  reveal(finish = 0) {
    this.slide();
    const notes = finish > 1 ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 880];
    notes.forEach((n, i) =>
      this.tone(
        n * (finish === 3 ? 1.25 : 1),
        finish > 1 ? 1.25 : 0.48,
        finish > 1 ? 0.1 : 0.055,
        0.04 + i * 0.095,
      ),
    );
    if (finish > 1) this.tone(130.81, 1.1, 0.14);
  }
  tick() {
    this.tone(660, 0.075, 0.055);
  }
}
