"use client";

import { WebGLSkeleton } from "./gl/WebGLSkeleton";

export default function Denoise() {
  return <WebGLSkeleton scene="denoise" duration={2400} />;
}
