"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { MARK } from "@/lib/Mark";
import { riseDelay } from "@/lib/Rise";
import { SITE_NAME } from "@/lib/Site";
import { type Section, useActiveSection } from "@/lib/useActiveSection";
import { useAddressFollows } from "@/lib/useAddressFollows";

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" } as const;
// The same empty list on every render, so nothing watching it starts over
const NO_SECTIONS: Section[] = [];

type TopNavProps = {
  back: { label: string; href: string };
  current: string;
  // The page's sections, to jump between where there is no room for the
  // list beside the page (see TableOfContents)
  sections?: Section[];
};

// At the top of every page but the home page, staying there as the page
// scrolls. On the left, the way back to the page above, joined by this page's
// name once its own title has scrolled out of sight (and, where there is no
// room for the list of sections beside the page, opening that list); on the
// right, apart from it so it is never clicked by mistake, whose site this is
export default function TopNav({ back, current, sections = NO_SECTIONS }: TopNavProps) {
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const listId = useId();
  // Held at the top of the window, with the page scrolling under it
  const [stuck, setStuck] = useState(false);
  // The page's title (its h1) has gone up behind the bar
  const [titleGone, setTitleGone] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(sections);
  useAddressFollows(active);
  // The list opens from the page's name in the bar, so it goes when that does
  const listed = open && titleGone;

  useEffect(() => {
    let frame = 0;
    // Measured from the page column the bar starts at the top of, and from the
    // bar's height, never from the bar's own place on screen: that moves with
    // its entrance, and a page reloaded scrolled down is measured mid-entrance
    const update = () => {
      frame = 0;
      const bar = nav.current;
      const column = bar?.parentElement?.getBoundingClientRect();
      const title = document.querySelector("h1")?.getBoundingClientRect();
      if (!bar || !column) return;
      setStuck(column.top < 0);
      setTitleGone(!!title && title.bottom <= bar.offsetHeight);
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
  }, []);

  // Closed by Escape (back to the button) or by a press anywhere outside it
  useEffect(() => {
    if (!listed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [listed]);

  return (
    <nav
      ref={nav}
      aria-label="Site"
      className={`sticky top-0 z-10 -mx-4 flex animate-rise items-center justify-between gap-4 px-4 py-3 transition-[background-color,box-shadow,backdrop-filter] duration-200 ${
        stuck
          ? "bg-[color-mix(in_srgb,var(--background)_85%,transparent)] shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)] backdrop-blur-md"
          : ""
      }`}
      style={riseDelay(0)}
    >
      <div className="relative flex min-w-0 items-center gap-1">
        <Link
          href={back.href}
          className="-ml-1 inline-flex shrink-0 items-center gap-1 text-muted transition-colors duration-150 hover:text-foreground"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
            <path d="M10 4L6 8l4 4" {...STROKE} />
          </svg>
          {back.label}
        </Link>
        {/* Only once the title itself is out of sight, so the name is never
            on the page twice */}
        <div
          inert={!titleGone}
          className="flex min-w-0 items-center gap-1 transition-[opacity,translate,filter] duration-300 ease-out"
          style={{
            opacity: titleGone ? 1 : 0,
            translate: titleGone ? "0 0" : "0 4px",
            filter: titleGone ? "blur(0)" : "blur(2px)",
          }}
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0 text-faint">
            <path d="M6 4l4 4-4 4" {...STROKE} />
          </svg>
          {sections.length > 0 ? (
            <>
              {/* Beside the page, its list of sections is already there */}
              <span className="hidden truncate lg:inline">{current}</span>
              {/* Without it, the page's name opens that list */}
              <button
                ref={toggle}
                type="button"
                aria-expanded={listed}
                aria-controls={listId}
                onClick={() => setOpen((o) => !o)}
                className="-mx-1 flex min-w-0 cursor-pointer items-center gap-1 rounded px-1 transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-faint lg:hidden"
              >
                <span className="truncate">{current}</span>
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className={`size-3.5 shrink-0 text-faint transition-transform duration-200 ${listed ? "rotate-180" : ""}`}
                >
                  <path d="M4 6l4 4 4-4" {...STROKE} />
                </svg>
              </button>
            </>
          ) : (
            <span className="truncate">{current}</span>
          )}
        </div>
        {listed && (
          <ul
            id={listId}
            className="absolute top-full left-0 mt-3 max-h-[60vh] w-56 overflow-y-auto rounded-[4px] bg-background p-1 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent),0_8px_24px_-8px_color-mix(in_srgb,var(--foreground)_18%,transparent)] motion-safe:animate-label"
          >
            {sections.map(({ id, title }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={active === id ? "location" : undefined}
                  onClick={() => setOpen(false)}
                  className={`block rounded-[3px] px-2.5 py-1.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-faint ${
                    active === id
                      ? "bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] font-medium text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link
        href="/"
        className="inline-flex shrink-0 items-center gap-1.5 text-sm text-faint transition-colors duration-150 hover:text-foreground"
      >
        <svg aria-hidden viewBox={MARK.viewBox} className="h-2.5 w-auto" fill="currentColor">
          <path d={MARK.path} />
        </svg>
        {SITE_NAME}
      </Link>
    </nav>
  );
}
