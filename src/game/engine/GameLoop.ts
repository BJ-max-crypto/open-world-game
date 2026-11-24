export class GameLoop {
  private frame = 0;
  private last = 0;
  private running = false;

  start(tick: (dt: number) => void): void {
    this.stop();
    this.running = true;
    this.last = performance.now();
    const step = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      tick(dt);
      this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  stop(): void {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}
