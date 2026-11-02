import type { ComponentType } from "react";
import { BloomingFlowers } from "./flowers/BloomingFlowers";

// Every 3D scene, by the name projects refer to it with (see Projects.ts)
export const SCENES = {
  "blooming-flowers": BloomingFlowers,
} satisfies Record<string, ComponentType>;

export type SceneName = keyof typeof SCENES;

// What every scene is composed for: its camera, and the dark it is drawn
// against (canvases are transparent; the frame around them paints this)
export const SCENE_CAMERA = { position: [0, 0, 4.5], fov: 45 } as const;
export const SCENE_BACKGROUND = "#07070b";
