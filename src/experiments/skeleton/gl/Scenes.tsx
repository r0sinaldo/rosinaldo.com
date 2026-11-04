"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Scene } from "./WebGLSkeleton";
import type { Raster } from "../Raster";
import { DUST_FRAGMENT, DUST_UNDER, DUST_VERTEX, FROST, QUAD, DENOISE } from "./Shaders";

type ScenesProps = {
  scene: Scene;
  raster: Raster;
  shown: boolean;
  duration: number;
  settled: boolean;
  onReady: () => void;
  onSettle: () => void;
};

export default function Scenes({ scene, raster, settled, onReady, ...timing }: ScenesProps) {
  return (
    <Canvas
      // Nothing to draw once the real post has taken over
      frameloop={settled ? "never" : "always"}
      flat
      linear
      dpr={[1, 2]}
      // Sized by its layout, not its box on screen: on the lab index the post
      // is shown scaled down, and the canvas would be scaled down twice
      resize={{ offsetSize: true }}
      gl={{ alpha: true, antialias: true, premultipliedAlpha: true }}
      onCreated={onReady}
      style={{ width: "100%", height: "100%" }}
    >
      {scene === "frost" && <Frost raster={raster} {...timing} />}
      {scene === "dust" && <Dust raster={raster} {...timing} />}
      {scene === "denoise" && <Denoise raster={raster} {...timing} />}
    </Canvas>
  );
}

type Timing = Pick<ScenesProps, "shown" | "duration" | "onSettle">;
type SceneProps = { raster: Raster } & Timing;

// The scene's clock: time for the waiting, and the handover's progress, run
// once the content lands. Both go straight into the uniforms of the material
// it returns a ref for
function useClock({ shown, duration, onSettle }: Timing) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const clock = useRef({ progress: 0, time: 0 });
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!shown) clock.current.progress = 0;
    invalidate();
  }, [shown, invalidate]);

  useFrame((_, delta) => {
    // A frame late after a hidden tab should not jump the handover
    const step = Math.min(delta, 1 / 20);
    const current = clock.current;
    current.time += step;
    if (shown && current.progress < 1) {
      current.progress = Math.min(1, current.progress + (step * 1000) / duration);
      if (current.progress === 1) onSettle();
    }
    if (material.current) {
      material.current.uniforms.uProgress.value = current.progress;
      material.current.uniforms.uTime.value = current.time;
    }
  });
  return material;
}

function texture(source: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(source);
  map.premultiplyAlpha = true;
  return map;
}

function useUniforms(raster: Raster, maps: Record<string, THREE.Texture>) {
  const uniforms = useMemo(
    () => ({
      uSize: { value: new THREE.Vector2(raster.width, raster.height) },
      uPost: { value: new THREE.Vector4(raster.post.x, raster.post.y, raster.post.width, raster.post.height) },
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uBackground: { value: new THREE.Vector3(...raster.background) },
      uForeground: { value: new THREE.Vector3(...raster.foreground) },
      ...Object.fromEntries(Object.entries(maps).map(([name, map]) => [name, { value: map }])),
    }),
    [raster, maps],
  );
  useEffect(() => () => Object.values(maps).forEach((map) => map.dispose()), [maps]);
  return uniforms;
}

const MATERIAL = { transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false } as const;

function Quad({
  fragment,
  raster,
  maps,
  timing,
}: {
  fragment: string;
  raster: Raster;
  maps: Record<string, THREE.Texture>;
  timing: Timing;
}) {
  const uniforms = useUniforms(raster, maps);
  const material = useClock(timing);
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={material} vertexShader={QUAD} fragmentShader={fragment} uniforms={uniforms} {...MATERIAL} />
    </mesh>
  );
}

function Frost({ raster, ...timing }: SceneProps) {
  const maps = useMemo(() => ({ uContent: texture(raster.content), uBones: texture(raster.bones) }), [raster]);
  return <Quad fragment={FROST} raster={raster} maps={maps} timing={timing} />;
}

function Denoise({ raster, ...timing }: SceneProps) {
  const maps = useMemo(() => ({ uContent: texture(raster.content), uBones: texture(raster.bones) }), [raster]);
  return <Quad fragment={DENOISE} raster={raster} maps={maps} timing={timing} />;
}

const GRAINS = 12000;
// The picture would take nearly all the grains by area; text and avatar are
// weighted up so they still form
const SMALL_WEIGHT = 3;

// Where each grain waits (somewhere in a bone) and where it lands (a point of
// the content, with its colour)
function grains(raster: Raster) {
  const { scale, width, height, post } = raster;
  const read = (source: HTMLCanvasElement) =>
    source.getContext("2d")!.getImageData(0, 0, source.width, source.height).data;
  const bones = read(raster.bones);
  const content = read(raster.content);
  const index = (x: number, y: number) => (Math.floor(y * scale) * raster.bones.width + Math.floor(x * scale)) * 4;
  const picture = post.y + post.height - 120;

  const homes: number[] = [];
  const targets: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = index(x, y);
      if (bones[i + 3] > 128) homes.push(x, y);
      if (content[i + 3] > 70) for (let w = 0; w < (y < picture ? SMALL_WEIGHT : 1); w++) targets.push(x, y);
    }
  }

  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const home = new Float32Array(GRAINS * 2);
  const target = new Float32Array(GRAINS * 2);
  const tint = new Float32Array(GRAINS * 3);
  const seeds = new Float32Array(GRAINS * 2);
  for (let g = 0; g < GRAINS; g++) {
    const h = Math.floor(random() * (homes.length / 2)) * 2;
    home[g * 2] = homes[h] + random();
    home[g * 2 + 1] = homes[h + 1] + random();
    const t = Math.floor(random() * (targets.length / 2)) * 2;
    const x = targets[t] + random();
    const y = targets[t + 1] + random();
    target[g * 2] = x;
    target[g * 2 + 1] = y;
    const i = index(x, y);
    tint[g * 3] = content[i] / 255;
    tint[g * 3 + 1] = content[i + 1] / 255;
    tint[g * 3 + 2] = content[i + 2] / 255;
    seeds[g * 2] = random();
    seeds[g * 2 + 1] = random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(GRAINS * 3), 3));
  geometry.setAttribute("home", new THREE.BufferAttribute(home, 2));
  geometry.setAttribute("target", new THREE.BufferAttribute(target, 2));
  geometry.setAttribute("tint", new THREE.BufferAttribute(tint, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 2));
  return geometry;
}

function Dust({ raster, ...timing }: SceneProps) {
  const geometry = useMemo(() => grains(raster), [raster]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const maps = useMemo(() => ({ uContent: texture(raster.content) }), [raster]);
  const base = useUniforms(raster, maps);
  // The same uniforms, so the clock driving the dust drives what is under it
  const uniforms = useMemo(() => ({ ...base, uPixelRatio: { value: pixelRatio } }), [base, pixelRatio]);
  const material = useClock(timing);
  return (
    <>
      <mesh frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial vertexShader={QUAD} fragmentShader={DUST_UNDER} uniforms={uniforms} {...MATERIAL} />
      </mesh>
      <points geometry={geometry} frustumCulled={false} renderOrder={1}>
        <shaderMaterial
          ref={material}
          vertexShader={DUST_VERTEX}
          fragmentShader={DUST_FRAGMENT}
          uniforms={uniforms}
          {...MATERIAL}
        />
      </points>
    </>
  );
}
