"use client";

import { Canvas } from "@react-three/fiber";
import WebGLBoundary from "@/components/WebGLBoundary";
import { SCENE_CAMERA, SCENES, type SceneName } from "./Scenes";

export default function SceneCanvas({ name }: { name: SceneName }) {
  const Scene = SCENES[name];
  return (
    <WebGLBoundary>
      <Canvas camera={SCENE_CAMERA} dpr={[1, 2]} shadows="soft" className="animate-fade-in">
        <Scene />
      </Canvas>
    </WebGLBoundary>
  );
}
