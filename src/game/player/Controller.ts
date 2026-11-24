export class Controller {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private lookX = 0;
  private lookY = 0;
  private element: HTMLElement | null = null;
  private onKeyDown: (event: KeyboardEvent) => void;
  private onKeyUp: (event: KeyboardEvent) => void;
  private onMouseMove: (event: MouseEvent) => void;
  private onMouseDown: (event: MouseEvent) => void;
  private onContext: (event: Event) => void;
  private onBlur: () => void;
  private onMouseUp: () => void;
  dragging = false;

  constructor() {
    this.onKeyDown = (event) => {
      if (isTyping(event.target)) return;
      if (event.code === "Space" || event.code.startsWith("Arrow")) event.preventDefault();
      if (!this.keys.has(event.code) && !event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    };
    this.onKeyUp = (event) => {
      this.keys.delete(event.code);
    };
    this.onMouseMove = (event) => {
      if (document.pointerLockElement === this.element || this.dragging) {
        this.lookX += event.movementX;
        this.lookY += event.movementY;
      }
    };
    this.onMouseDown = (event) => {
      if (event.button === 0 && event.target === this.element) this.dragging = true;
    };
    this.onContext = (event) => event.preventDefault();
    this.onBlur = () => {
      this.keys.clear();
      this.dragging = false;
    };
    this.onMouseUp = () => {
      this.dragging = false;
    };
  }

  attach(element: HTMLElement): void {
    this.element = element;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("blur", this.onBlur);
    element.addEventListener("contextmenu", this.onContext);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("blur", this.onBlur);
    this.element?.removeEventListener("contextmenu", this.onContext);
    this.keys.clear();
    this.element = null;
  }

  consumeLook(): { x: number; y: number } {
    const look = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return look;
  }

  consumePress(code: string): boolean {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  endFrame(): void {
    this.pressed.clear();
  }

  get forward(): number {
    return (this.keys.has("ArrowUp") ? 1 : 0) - (this.keys.has("ArrowDown") ? 1 : 0);
  }

  get strafe(): number {
    return (this.keys.has("ArrowRight") ? 1 : 0) - (this.keys.has("ArrowLeft") ? 1 : 0);
  }

  get sprint(): boolean {
    return this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
  }

  get jump(): boolean {
    return this.keys.has("Space");
  }
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
