import {
  CanvasTexture,
  Color,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

export interface CityMaterials {
  road: MeshStandardMaterial;
  sidewalk: MeshStandardMaterial;
  ground: Record<"civic" | "pier" | "house" | "yard", MeshStandardMaterial>;
  facade: Record<"civic" | "pier" | "house" | "yard", MeshStandardMaterial>;
  trim: MeshStandardMaterial;
  water: MeshStandardMaterial;
  pier: MeshStandardMaterial;
  marker: MeshStandardMaterial;
  trunk: MeshStandardMaterial;
  canopy: MeshStandardMaterial;
  lamp: MeshStandardMaterial;
  bulb: MeshStandardMaterial;
  dispose: () => void;
}

export function createCityMaterials(): CityMaterials {
  const noise = noiseTexture();
  const roadMap = asphaltTexture();
  const facades = {
    civic: facadeTexture("#243044", "#f0c9a0", 5, 10),
    pier: facadeTexture("#3d4a46", "#d7e2dc", 3, 4),
    house: facadeTexture("#6d5344", "#ffe1b0", 2, 3),
    yard: facadeTexture("#4a4036", "#f2d7a2", 4, 3),
  };
  const masks = {
    civic: windowMask(5, 10),
    pier: windowMask(3, 4),
    house: windowMask(2, 3),
    yard: windowMask(4, 3),
  };

  const road = new MeshStandardMaterial({ map: roadMap, color: "#8d93a0", roughness: 0.94, metalness: 0.02 });
  const sidewalk = new MeshStandardMaterial({ map: noise, color: "#6d7380", roughness: 0.92 });
  const ground = {
    civic: tint(noise, "#3c4452"),
    pier: tint(noise, "#3a4a4e"),
    house: tint(noise, "#3e5344"),
    yard: tint(noise, "#534838"),
  };
  const facade = {
    civic: lit(facades.civic, masks.civic, "#ffd2a8", 0.85),
    pier: lit(facades.pier, masks.pier, "#d5ece4", 0.35),
    house: lit(facades.house, masks.house, "#ffbf7a", 0.7),
    yard: lit(facades.yard, masks.yard, "#ffd7a1", 0.45),
  };

  const all = [
    road,
    sidewalk,
    ...Object.values(ground),
    ...Object.values(facade),
  ];

  return {
    road,
    sidewalk,
    ground,
    facade,
    trim: new MeshStandardMaterial({ color: "#1b2128", roughness: 0.7 }),
    water: new MeshStandardMaterial({
      color: "#1c4d5c",
      roughness: 0.18,
      metalness: 0.45,
      transparent: true,
      opacity: 0.88,
    }),
    pier: new MeshStandardMaterial({ color: "#6a5a48", roughness: 0.86 }),
    marker: new MeshStandardMaterial({ color: "#f0b56a", emissive: "#e39a45", emissiveIntensity: 0.8 }),
    trunk: new MeshStandardMaterial({ color: "#5a4032", roughness: 0.9 }),
    canopy: new MeshStandardMaterial({ color: "#2f6a45", roughness: 0.8 }),
    lamp: new MeshStandardMaterial({ color: "#23282f", roughness: 0.5, metalness: 0.4 }),
    bulb: new MeshStandardMaterial({ color: "#fff1cc", emissive: "#ffd27a", emissiveIntensity: 1.4 }),
    dispose: () => {
      all.forEach((material) => material.dispose());
      noise.dispose();
      roadMap.dispose();
      Object.values(facades).forEach((texture) => texture.dispose());
      Object.values(masks).forEach((texture) => texture.dispose());
    },
  };
}

function tint(map: Texture, color: string): MeshStandardMaterial {
  return new MeshStandardMaterial({ map, color, roughness: 0.96, metalness: 0 });
}

function lit(map: Texture, mask: Texture, emissive: string, intensity: number): MeshStandardMaterial {
  return new MeshStandardMaterial({
    map,
    emissive: new Color(emissive),
    emissiveMap: mask,
    emissiveIntensity: intensity,
    roughness: 0.86,
    metalness: 0.04,
  });
}

function makeTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a canvas texture.");
  draw(ctx, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function noiseTexture(): CanvasTexture {
  const texture = makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i += 1) {
      const shade = 180 + Math.floor(hash(i) * 60);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(Math.floor(hash(i + 3) * w), Math.floor(hash(i + 9) * h), 2, 2);
    }
  });
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(28, 28);
  return texture;
}

function asphaltTexture(): CanvasTexture {
  const texture = makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#2c3138";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i += 1) {
      const shade = 30 + Math.floor(hash(i + 20) * 40);
      ctx.fillStyle = `rgb(${shade},${shade},${shade + 4})`;
      ctx.fillRect(hash(i) * w, hash(i + 4) * h, 2, 2);
    }
  });
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(32, 32);
  return texture;
}

function facadeTexture(wall: string, glass: string, cols: number, rows: number): CanvasTexture {
  return makeTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, h);
    const padX = 10;
    const padY = 12;
    const cellW = (w - padX * 2) / cols;
    const cellH = (h - padY * 2) / rows;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const lit = hash(x * 17 + y * 31) > 0.38;
        ctx.fillStyle = lit ? glass : "#12161c";
        ctx.fillRect(padX + x * cellW + 3, padY + y * cellH + 4, cellW - 8, cellH - 10);
      }
    }
  });
}

function windowMask(cols: number, rows: number): CanvasTexture {
  const texture = makeTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const padX = 10;
    const padY = 12;
    const cellW = (w - padX * 2) / cols;
    const cellH = (h - padY * 2) / rows;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (hash(x * 17 + y * 31) <= 0.38) continue;
        ctx.fillStyle = "#fff";
        ctx.fillRect(padX + x * cellW + 3, padY + y * cellH + 4, cellW - 8, cellH - 10);
      }
    }
  });
  return texture;
}

function hash(n: number): number {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}
