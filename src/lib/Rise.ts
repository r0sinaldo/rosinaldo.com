import type { CSSProperties } from "react";

const BASE_DELAY = 250;
const STAGGER = 90;

// Blocks come in one after another, top to bottom (the `animate-rise` class);
// this gives the n-th its start time. The base delay lets the page settle first
export const riseDelay = (step: number) => ({ "--delay": `${BASE_DELAY + step * STAGGER}ms` }) as CSSProperties;
