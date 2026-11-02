"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False during server rendering and hydration, true after. Unlike a state set
// in an effect, this re-renders only once and never mismatches the server HTML
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
