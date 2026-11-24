"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { LoopOnce, LoopRepeat, type AnimationAction, type Group, type Mesh } from "three";
import {
  CLIP_NAMES,
  LOOPING_CLIPS,
  nextClip,
  clipTimeScale,
  type ClipId,
  type ClipState,
  type MotionSample,
} from "@/game/player/locomotion";

const MODEL = "/models/characters/player.glb";

interface HumanAvatarProps {
  motion: RefObject<MotionSample>;
}

export function HumanAvatar({ motion }: HumanAvatarProps) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(MODEL);
  const { actions, mixer } = useAnimations(gltf.animations, group);
  const phase = useRef<ClipState>({ clip: "idle", land: 0 });
  const playing = useRef<ClipId | null>(null);

  useEffect(() => {
    gltf.scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
    });
  }, [gltf.scene]);

  useEffect(() => {
    const idle = actions[CLIP_NAMES.idle];
    idle?.reset().fadeIn(0.1).play();
    playing.current = "idle";
    return () => {
      mixer.stopAllAction();
    };
  }, [actions, mixer]);

  useFrame((_, delta) => {
    const sample = motion.current;
    if (!sample) return;
    const dt = Math.min(delta, 1 / 30);
    const next = nextClip(phase.current, sample, dt);
    phase.current = next;
    if (playing.current !== next.clip) {
      fadeTo(actions, playing.current, next.clip);
      playing.current = next.clip;
    }
    const action = actions[CLIP_NAMES[next.clip]];
    if (action) action.timeScale = clipTimeScale(next.clip, sample.speed);
  });

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}

function fadeTo(
  actions: Record<string, AnimationAction | null>,
  from: ClipId | null,
  to: ClipId,
): void {
  const next = actions[CLIP_NAMES[to]];
  if (!next) return;
  const loop = LOOPING_CLIPS.has(to);
  next.reset();
  next.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
  next.clampWhenFinished = !loop;
  next.fadeIn(0.16).play();
  if (!from || from === to) return;
  actions[CLIP_NAMES[from]]?.fadeOut(0.16);
}

useGLTF.preload(MODEL);
