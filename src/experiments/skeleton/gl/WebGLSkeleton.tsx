"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { MARGIN, useRaster } from "../Raster";
import { BONE_LAYOUT, CONTENT_LAYOUT, Crossfade, Frame, useLoading, usePicture } from "../Skeleton";

// three.js only loads with the first of these demos to be seen, and only in
// the browser
const Scenes = dynamic(() => import("./Scenes"), { ssr: false });

export type Scene = "frost" | "dust" | "denoise";

const TIMES = [2600];

// The frame shared by the WebGL skeletons: the real post, laid out but hidden
// while the shader plays the placeholder and the handover, and shown, crisp,
// once the shader has drawn it in exactly
export function WebGLSkeleton({ scene, duration }: { scene: Scene; duration: number }) {
  const { root, loading, replay } = useLoading(TIMES);
  usePicture(root);
  const reducedMotion = useReducedMotion();
  const { content, bones, raster } = useRaster(!reducedMotion);
  const [ready, setReady] = useState(false);
  const [settled, setSettled] = useState(false);
  const shown = !loading;

  if (reducedMotion) {
    return (
      <Frame root={root} loading={loading} replay={replay}>
        <Crossfade shown={shown} />
      </Frame>
    );
  }

  return (
    <Frame
      root={root}
      loading={loading}
      replay={() => {
        setSettled(false);
        replay();
      }}
    >
      <div className="relative">
        {/* Until the shader is up, the plain placeholder; after, only measured */}
        <div ref={bones} aria-hidden className={`absolute inset-0 [&_.bone]:bg-none ${ready ? "invisible" : ""}`}>
          {BONE_LAYOUT}
        </div>
        <div
          ref={content}
          style={{
            opacity: settled ? 1 : 0,
            transition: settled ? `opacity 200ms ease-out` : "none",
          }}
        >
          {CONTENT_LAYOUT}
        </div>
        {raster && (
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: -MARGIN,
              top: -MARGIN,
              width: raster.width,
              height: raster.height,
              opacity: settled ? 0 : 1,
              transition: settled ? `opacity 200ms ease-out 150ms` : "none",
            }}
          >
            <Scenes
              scene={scene}
              raster={raster}
              shown={shown}
              duration={duration}
              settled={settled}
              onReady={() => setReady(true)}
              onSettle={() => setSettled(true)}
            />
          </div>
        )}
      </div>
    </Frame>
  );
}
