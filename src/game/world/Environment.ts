import {
  BackSide,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  type Object3D,
} from "three";

export class Environment {
  readonly sun: DirectionalLight;
  readonly hemi: HemisphereLight;
  private readonly sky: Mesh;
  private readonly fog: Fog;
  readonly disposables: Object3D[] = [];

  constructor(scene: Scene) {
    this.fog = new Fog("#c47a4a", 70, 230);
    scene.fog = this.fog;
    scene.background = new Color("#1a2230");

    const skyTex = skyTexture();
    this.sky = new Mesh(
      new SphereGeometry(380, 28, 18),
      new MeshBasicMaterial({ map: skyTex, side: BackSide, depthWrite: false, fog: false }),
    );
    scene.add(this.sky);

    this.hemi = new HemisphereLight("#f0d2b4", "#2a3330", 0.72);
    scene.add(this.hemi);

    this.sun = new DirectionalLight("#ffc89a", 1.35);
    this.sun.position.set(40, 54, 24);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 160;
    this.sun.shadow.camera.left = -55;
    this.sun.shadow.camera.right = 55;
    this.sun.shadow.camera.top = 55;
    this.sun.shadow.camera.bottom = -55;
    this.sun.shadow.bias = -0.00035;
    scene.add(this.sun);
    scene.add(this.sun.target);
  }

  setShadows(enabled: boolean): void {
    this.sun.castShadow = enabled;
  }

  follow(x: number, z: number): void {
    this.sun.position.set(x + 28, 52, z + 16);
    this.sun.target.position.set(x, 0, z);
    this.sun.target.updateMatrixWorld();
  }

  dispose(): void {
    this.sky.geometry.dispose();
    const material = this.sky.material;
    if (material instanceof MeshBasicMaterial) {
      material.map?.dispose();
      material.dispose();
    }
  }
}

function skyTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not paint the sky.");
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#121826");
  gradient.addColorStop(0.42, "#243248");
  gradient.addColorStop(0.7, "#7a4b3a");
  gradient.addColorStop(1, "#e39a55");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 256);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
