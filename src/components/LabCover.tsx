"use client";

import { useEffect, useRef, useState } from "react";
import { AutoplayContext } from "@/experiments/Autoplay";
import { DEMOS, type DemoName } from "@/experiments/Demos";
import { useReducedMotion } from "@/lib/useReducedMotion";

// How long each demo is shown for, long enough to play through once
const SHOWN = 6500;
// How much of the card the demo may take up, at most, and the largest it is
// ever shown, so a wide card does not blow it up
const FILL = 0.84;
const MOST = 0.9;

// A page's cover on the lab index: its demos, one after another, each playing
// by itself, round and round, scaled to fit the card. With motion reduced,
// just the first, still
export default function LabCover({ demos }: { demos: DemoName[] }) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const scaler = useRef<HTMLDivElement>(null);

  // Measured again whenever the card or the demo changes size, before it is drawn
  useEffect(() => {
    const outer = card.current;
    const inner = scaler.current;
    if (!outer || !inner) return;
    const fit = () => {
      const { offsetWidth: width, offsetHeight: height } = inner;
      if (!width || !height) return;
      const scale = Math.min(MOST, (outer.clientWidth * FILL) / width, (outer.clientHeight * FILL) / height);
      inner.style.scale = String(scale);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % demos.length), SHOWN);
    return () => clearTimeout(timer);
  }, [index, demos.length, reducedMotion]);

  const Demo = DEMOS[demos[index]];
  return (
    <div ref={card} className="absolute inset-0">
      {/* Centred by its own middle, so it stays centred even when it is laid
          out wider than the card, before it is scaled down */}
      <div ref={scaler} className="absolute top-1/2 left-1/2 w-max -translate-1/2">
        <div key={index} className="motion-safe:animate-label">
          <AutoplayContext value={!reducedMotion}>
            <Demo />
          </AutoplayContext>
        </div>
      </div>
    </div>
  );
}
