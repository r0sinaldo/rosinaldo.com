"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { createSeedGeometry } from "./Geometry";

type ParticlesProps = {
  count: number;
  vertexShader: string;
  fragmentShader: string;
  // Added onto what is behind, so overlapping glows brighten each other
  additive?: boolean;
  reducedMotion: boolean;
};

// Points animated entirely by their shader (pollen, fireflies): each frame
// only moves the clock forward
export default function Particles({ count, vertexShader, fragmentShader, additive, reducedMotion }: ParticlesProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 } }), []);
  const geometry = useMemo(() => createSeedGeometry(count), [count]);

  useFrame(({ gl }, delta) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value += delta * (reducedMotion ? 0.25 : 1);
    material.current.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  // Positions come from the shader, so three's bounds would be wrong: never cull
  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        premultipliedAlpha
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
        depthWrite={false}
      />
    </points>
  );
}
