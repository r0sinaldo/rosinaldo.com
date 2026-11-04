"use client";

import { useEffect, useState } from "react";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

// How long "Copied" stays before the button goes back to its link
const COPIED_MS = 1600;

// Copies the address of a section of the page, to share it: a faint link
// icon beside the section's title, saying so for a moment once it is done
export default function CopyLink({ id, title }: { id: string; title: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    const address = new URL(`#${id}`, window.location.href).toString();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch {
      // Where copying is not allowed, the address bar gets it instead
      window.location.hash = id;
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy a link to ${title}`}
      className="relative -m-1 inline-flex cursor-pointer items-center rounded p-1 text-faint transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-faint"
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
        {copied ? (
          <path d="M3.5 8.5l3 3 6-7" {...STROKE} />
        ) : (
          <path
            d="M6.5 9.5l3-3M7.25 4.75l.75-.75a2.47 2.47 0 0 1 3.5 3.5l-.75.75M8.75 11.25l-.75.75a2.47 2.47 0 0 1-3.5-3.5l.75-.75"
            {...STROKE}
          />
        )}
      </svg>
      <span aria-live="polite" className="absolute left-full ml-1 text-xs whitespace-nowrap text-faint">
        {copied && <span className="block motion-safe:animate-label">Copied</span>}
      </span>
    </button>
  );
}
