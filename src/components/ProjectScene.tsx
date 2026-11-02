"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useState } from "react";
import type { SceneName } from "@/scenes/Scenes";

const SceneCanvas = dynamic(() => import("@/scenes/SceneCanvas"), { ssr: false });

export default function ProjectScene({ scene }: { scene: SceneName }) {
  // With cacheComponents, Next keeps visited pages mounted but hidden (React
  // Activity). A hidden canvas would go on rendering and hold its WebGL
  // context, so the scene is dropped when the page hides (layout-effect
  // cleanup) and brought back when it shows again. Setting state straight in
  // an effect is disallowed by the React lint rules, hence the next frame
  const [shown, setShown] = useState(true);
  useLayoutEffect(() => () => setShown(false), []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return shown ? <SceneCanvas name={scene} /> : null;
}
