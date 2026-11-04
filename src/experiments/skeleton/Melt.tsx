"use client";

import { type CSSProperties, useEffect, useId, useRef } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { BONES, Bone, CONTENT_LAYOUT, Crossfade, Frame, Layout, useLoading, usePicture } from "./Skeleton";

const TIMES = [2600];
// Before melting, the grey breathes in to full, wherever its breath was
const INHALE = 300;
const MELT = 1500;
const UNMELT = 250;
// The breath travels down the post, one piece after the other
const BREATH_STAGGER = 140;
// How sharp the melting edge is: higher is crisper
const EDGE = 12;
// How far the grey sags and wavers as it melts, at its most
const FLOW = 10;

// Gentle at both ends, and nearly even between, so the melt keeps moving
// rather than rushing through its middle
const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

// What decides where the post melts first: mostly noise, which gives the
// shapes, and partly height, so it melts from the top down, as if running
const NOISE = 0.55;
const HEIGHT = 0.3;
// The noise stays almost wholly between 0.28 and 0.79 (measured), so the field
// runs from about 0.15 at the top to 0.75 at the bottom. The threshold sweeps
// from just under that to past it, so the melt starts at once and ends at
// nothing
const threshold = (progress: number) => 0.12 + ease(progress) * 0.68;
// The picture's grey turns to the picture's colour only once the melt reaches
// it (its field starts at about 0.3), not while it is still whole
const tint = (t: number) => Math.min(Math.max((t - 0.28) / 0.25, 0), 1);

// The field read two ways: the grey stays where it is above the threshold, the
// content shows where it is below. The two are exact complements, so the
// content condenses into precisely the gaps the grey leaves
const boneMask = (t: number) => `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${EDGE} 0 0 0 ${-EDGE * t}`;
const contentMask = (t: number) => `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${-EDGE} 0 0 0 ${1 + EDGE * t}`;

// Dark at the top, light at the bottom, stretched over the whole post
const RAMP = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" preserveAspectRatio="none"><linearGradient id="g" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient><rect width="8" height="8" fill="url(#g)"/></svg>`,
)}`;

// One noise for the whole post, so the grey melts as one sheet across every
// piece rather than piece by piece
function Field() {
  return (
    <>
      <feTurbulence type="fractalNoise" baseFrequency="0.014 0.02" numOctaves={3} seed={7} result="noise" />
      <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="grain" />
      <feImage href={RAMP} preserveAspectRatio="none" result="ramp" />
      <feComposite in="grain" in2="ramp" operator="arithmetic" k2={NOISE} k3={HEIGHT} result="field" />
    </>
  );
}

const breathOf = (index: number) => ({ animationDelay: `${index * BREATH_STAGGER}ms` });

// The grey pieces, each breathing in turn. The picture's piece turns to the
// picture's own average colour as it melts, so what is left of it over the
// picture reads as the picture in a haze, not as grey
const BREATHING_BONES = (
  <Layout
    avatar={
      <div className="breathing absolute inset-0" style={breathOf(0)}>
        {BONES.avatar}
      </div>
    }
    name={
      <div className="breathing absolute inset-0" style={breathOf(1)}>
        {BONES.name}
      </div>
    }
    handle={
      <div className="breathing absolute inset-0" style={breathOf(2)}>
        {BONES.handle}
      </div>
    }
    lines={BONES.lines.map((bone, i) => (
      <div key={i} className="breathing absolute inset-0" style={breathOf(3 + i)}>
        {bone}
      </div>
    ))}
    picture={
      <div className="breathing absolute inset-0" style={breathOf(5)}>
        <Bone
          className="inset-0 rounded-[10px]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--picture-tone) calc(var(--tint, 0) * 100%), color-mix(in srgb, var(--foreground) 7%, transparent))",
          }}
        />
      </div>
    }
  />
);

function Melting({ shown }: { shown: boolean }) {
  const id = useId().replace(/[^\w-]/g, "");
  const post = useRef<HTMLDivElement>(null);
  const boneLayer = useRef<HTMLDivElement>(null);
  const contentLayer = useRef<HTMLDivElement>(null);
  const boneMatrix = useRef<SVGFEColorMatrixElement>(null);
  const contentMatrix = useRef<SVGFEColorMatrixElement>(null);
  const flow = useRef<SVGFEDisplacementMapElement>(null);
  const progress = useRef(0);
  const inhales = useRef<Animation[]>([]);

  useEffect(() => {
    const draw = (p: number) => {
      progress.current = p;
      const t = threshold(p);
      boneMatrix.current?.setAttribute("values", boneMask(t));
      contentMatrix.current?.setAttribute("values", contentMask(t));
      // The grey runs most in the middle of the melt, and is still at both ends
      flow.current?.setAttribute("scale", String(FLOW * Math.sin(Math.PI * ease(p))));
      post.current?.style.setProperty("--tint", String(tint(t)));
      // Filters only while melting: at rest the layers are drawn as they are,
      // so the text keeps its own crisp rendering
      const melting = p > 0 && p < 1;
      if (boneLayer.current) {
        boneLayer.current.style.filter = melting ? `url(#${id}-bone)` : "none";
        boneLayer.current.style.opacity = p === 1 ? "0" : "1";
      }
      if (contentLayer.current) {
        contentLayer.current.style.filter = melting ? `url(#${id}-content)` : "none";
        contentLayer.current.style.opacity = p === 0 ? "0" : "1";
      }
    };

    const breaths = [...(boneLayer.current?.querySelectorAll<HTMLElement>(".breathing") ?? [])];
    const from = progress.current;
    let wait = 0;
    if (shown && from === 0) {
      // Hold each piece's breath where it is and let it breathe in to full,
      // so the melt always starts from the grey at its fullest
      inhales.current = breaths.map((breath) => {
        const opacity = getComputedStyle(breath).opacity;
        breath.getAnimations().forEach((animation) => animation.pause());
        return breath.animate([{ opacity }, { opacity: 1 }], {
          duration: INHALE,
          easing: "cubic-bezier(0.23, 1, 0.32, 1)",
          fill: "forwards",
        });
      });
      wait = INHALE;
    } else if (!shown) {
      inhales.current.forEach((inhale) => inhale.cancel());
      inhales.current = [];
      breaths.forEach((breath) => breath.getAnimations().forEach((animation) => animation.play()));
    }

    const to = shown ? 1 : 0;
    const duration = (shown ? MELT : UNMELT) * Math.abs(to - from);
    const start = performance.now() + wait;
    let frame = 0;
    const tick = (now: number) => {
      const k = duration ? Math.min(Math.max((now - start) / duration, 0), 1) : 1;
      draw(from + (to - from) * k);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shown, id]);

  // Filter regions a little larger than the post, so the sagging grey is not
  // cut off at its edges
  const region = { x: "-5%", y: "-5%", width: "110%", height: "110%", colorInterpolationFilters: "sRGB" } as const;

  return (
    <div ref={post} className="relative [&_.bone]:bg-none" style={{ "--tint": 0 } as CSSProperties}>
      <div ref={boneLayer} aria-hidden>
        {BREATHING_BONES}
      </div>
      <div ref={contentLayer} className="absolute inset-0" style={{ opacity: 0 }}>
        {CONTENT_LAYOUT}
      </div>
      <svg aria-hidden className="absolute size-0">
        <filter id={`${id}-bone`} {...region}>
          <Field />
          {/* The grey sags down as it melts, wavering a little side to side:
              red, centred, for the waver; green, kept low, so every point
              takes its colour from above it */}
          <feColorMatrix
            in="noise"
            type="matrix"
            values="1 0 0 0 0  0 -0.6 0 0 0.5  0 0 0 0 0  0 0 0 0 1"
            result="drift"
          />
          <feDisplacementMap
            ref={flow}
            in="SourceGraphic"
            in2="drift"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
            result="flowing"
          />
          <feColorMatrix ref={boneMatrix} in="field" type="matrix" values={boneMask(threshold(0))} result="mask" />
          <feComposite in="flowing" in2="mask" operator="in" />
        </filter>
        <filter id={`${id}-content`} {...region}>
          <Field />
          <feColorMatrix
            ref={contentMatrix}
            in="field"
            type="matrix"
            values={contentMask(threshold(0))}
            result="mask"
          />
          <feComposite in="SourceGraphic" in2="mask" operator="in" />
        </filter>
      </svg>
    </div>
  );
}

export default function Melt() {
  const { root, loading, replay } = useLoading(TIMES);
  usePicture(root);
  const reducedMotion = useReducedMotion();
  const shown = !loading;

  return (
    <Frame root={root} loading={loading} replay={replay}>
      {/* Without motion: no breath, no melt, a plain crossfade */}
      {reducedMotion ? <Crossfade shown={shown} /> : <Melting shown={shown} />}
    </Frame>
  );
}
