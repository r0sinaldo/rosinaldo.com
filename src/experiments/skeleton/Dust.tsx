"use client";

import { WebGLSkeleton } from "./gl/WebGLSkeleton";

export default function Dust() {
  return <WebGLSkeleton scene="dust" duration={2600} />;
}
