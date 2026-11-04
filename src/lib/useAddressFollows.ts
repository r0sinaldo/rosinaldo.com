"use client";

import { useEffect, useRef } from "react";

// The id of the section the address points to (its #id), if any
const addressedSection = () => decodeURIComponent(window.location.hash.slice(1));

// Keeps the page and a section's address (#id) in step. Opened with one, it
// goes straight to that section; and the address keeps it only while that
// section is the one being read: once the page has reached it and is then
// scrolled on to another, the address drops it, so it never claims a place the
// page has left. Replaced, not pushed, so the back button is not affected
export function useAddressFollows(active: string | undefined) {
  const reached = useRef(false);

  useEffect(() => {
    // Opened with a section's address, the page goes straight there: left to
    // the browser, it scrolls smoothly from the top, which takes a while and
    // can be cut short while the page is still loading
    const id = addressedSection();
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "instant", block: "start" });
    const onHashChange = () => {
      reached.current = false;
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const id = addressedSection();
    if (!id || !active) return;
    if (active === id) reached.current = true;
    else if (reached.current) {
      history.replaceState(history.state, "", window.location.pathname + window.location.search);
      reached.current = false;
    }
  }, [active]);
}
