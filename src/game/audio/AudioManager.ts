export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private volume = 0.65;
  private stepClock = 0;
  unlocked = false;

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.master) this.master.gain.value = this.volume;
  }

  unlock(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    this.unlocked = true;
    this.startEngine();
  }

  update(dt: number, movingOnFoot: boolean, sprinting: boolean, driving: boolean, speed: number): void {
    if (!this.unlocked || !this.ctx || !this.engineGain) return;
    const target = driving ? 0.018 + Math.min(0.08, Math.abs(speed) / 280) : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    if (this.engine) {
      const rate = driving ? 46 + Math.abs(speed) * 3.2 : 40;
      this.engine.frequency.setTargetAtTime(rate, this.ctx.currentTime, 0.1);
    }
    if (!movingOnFoot) {
      this.stepClock = 0;
      return;
    }
    this.stepClock -= dt;
    if (this.stepClock <= 0) {
      this.stepClock = sprinting ? 0.28 : 0.46;
      this.blip(70, 0.045, 0.04);
    }
  }

  stinger(): void {
    if (!this.unlocked || !this.ctx || !this.master) return;
    [523, 659, 784].forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const when = this.ctx!.currentTime + index * 0.08;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.08, when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start(when);
      osc.stop(when + 0.3);
    });
  }

  dispose(): void {
    this.engine?.stop();
    void this.ctx?.close();
    this.ctx = null;
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return this.ctx;
  }

  private startEngine(): void {
    if (!this.ctx || !this.master || this.engine) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 42;
    filter.type = "lowpass";
    filter.frequency.value = 240;
    gain.gain.value = 0;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start();
    this.engine = osc;
    this.engineGain = gain;
  }

  private blip(frequency: number, duration: number, level: number): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
    source.stop(this.ctx.currentTime + duration);
  }
}
