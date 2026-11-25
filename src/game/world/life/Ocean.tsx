"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial, Vector3 } from "three";

const vertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    float wx = world.x;
    float wz = world.z;
    float h = sin(wx * 0.16 + uTime * 1.05) * 0.22
      + sin(wz * 0.23 - uTime * 0.75) * 0.14
      + sin((wx + wz) * 0.09 + uTime * 0.4) * 0.09;
    world.y += h;
    float dx = cos(wx * 0.16 + uTime * 1.05) * 0.0352;
    float dz = cos(wz * 0.23 - uTime * 0.75) * 0.0322;
    vNormalW = normalize(vec3(-dx, 1.0, -dz));
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSun;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(dot(normalize(vNormalW), viewDir), 0.0), 3.0);
    float shore = smoothstep(-36.0, -25.0, vWorld.z);
    float crest = smoothstep(0.06, 0.16, vWorld.y);
    vec3 color = mix(uDeep, uShallow, shore * 0.7);
    color += fresnel * vec3(0.72, 0.8, 0.78);
    color += max(dot(normalize(vNormalW), normalize(uSun)), 0.0) * vec3(0.18, 0.12, 0.06);
    color = mix(color, vec3(0.86, 0.91, 0.9), crest * (0.25 + shore * 0.55));
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Gerstner-style harbor water. The same waveHeight() drives the boats. */
export function Ocean() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new Color("#0c3c44") },
          uShallow: { value: new Color("#3e8f96") },
          uSun: { value: new Vector3(-0.65, 0.5, -0.45) },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
      }),
    [],
  );
  const ref = useRef(material);
  ref.current = material;

  useFrame(({ clock }) => {
    ref.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -48]} material={material}>
      <planeGeometry args={[180, 52, 70, 28]} />
    </mesh>
  );
}
