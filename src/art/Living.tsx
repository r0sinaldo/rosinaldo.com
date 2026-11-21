"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import Painting, { WALL } from "./Painting";

// The home page's painting, alive: wet paint, poured for as long as the page
// is open (see Wet). three.js and the rest of it load after the page has.
// Where WebGL is missing or fails, and with motion reduced, the still
// painting takes its place (see Painting)
export default function Living() {
  const wall = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const still = reducedMotion || failed;

  useEffect(() => {
    if (still) return;
    let wet: { dispose: () => void } | null = null;
    let gone = false;
    import("./Wet")
      .then(({ createWet }) => {
        if (gone || !canvas.current || !wall.current) return;
        wet = createWet(canvas.current, wall.current, () => setFailed(true));
      })
      .catch((error) => {
        console.info("[painting] no wet paint, showing the still painting:", error?.message ?? error);
        if (!gone) setFailed(true);
      });
    return () => {
      gone = true;
      wet?.dispose();
    };
  }, [still]);

  if (still) return <Painting />;
  return (
    <div ref={wall} aria-hidden className={WALL}>
      <canvas ref={canvas} className="absolute inset-0 size-full" />
    </div>
  );
}
