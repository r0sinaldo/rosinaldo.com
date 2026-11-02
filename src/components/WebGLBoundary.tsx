"use client";

import { Component, type ReactNode } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { supportsWebGL } from "@/lib/WebGL";

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("3D scene failed, leaving it out", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// WebGL can only be checked in the browser: until hydration, render nothing,
// so the server and the first client render agree
export default function WebGLBoundary({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated || !supportsWebGL()) return null;
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
