"use client";

import { useEffect, useState } from "react";

export type Section = { id: string; title: string };

// The section being read is the last one whose top has passed this line,
// a third of the way down the screen
const READING_LINE = 1 / 3;

// Which of a page's sections is being read, kept up to date as it scrolls
export function useActiveSection(sections: Section[]) {
  const [active, setActive] = useState<string | undefined>(sections[0]?.id);

  useEffect(() => {
    if (!sections.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * READING_LINE;
      // At the very bottom the last sections can never reach the line
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = sections[0]?.id;
      for (const { id } of sections) {
        const top = document.getElementById(id)?.getBoundingClientRect().top ?? Infinity;
        if (top <= line) current = id;
      }
      setActive(atBottom ? sections.at(-1)?.id : current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [sections]);

  return active;
}
