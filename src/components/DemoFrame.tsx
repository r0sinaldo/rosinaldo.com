"use client";

import { Fragment, type ReactNode, useEffect, useState } from "react";

// A demo on a clean stage
export default function DemoFrame({ children }: { children: ReactNode }) {
  // Pages stay mounted, hidden, when navigated away from. Each time this one
  // is hidden the demo is remounted, so coming back to it is like opening it
  // for the first time: skeletons loading again, buttons at rest
  const [visit, setVisit] = useState(0);
  useEffect(() => () => setVisit((n) => n + 1), []);

  // Edged with a real border, not a ring of shadow outside the box: Safari
  // leaves parts of such a ring unpainted on a clipped, rounded box
  return (
    <div className="grid h-80 place-items-center overflow-hidden rounded-[4px] border border-[color-mix(in_srgb,var(--foreground)_7%,transparent)] bg-background p-6 shadow-[0_1px_1px_color-mix(in_srgb,var(--foreground)_3%,transparent)]">
      <Fragment key={visit}>{children}</Fragment>
    </div>
  );
}
