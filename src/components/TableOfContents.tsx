"use client";

import { riseDelay } from "@/lib/Rise";
import { type Section, useActiveSection } from "@/lib/useActiveSection";

// "On this page", as in most documentation: the page's sections, with the one
// you are reading marked as you scroll. Only on wide screens; on narrower
// ones the same list opens from the bar at the top (see TopNav)
export default function TableOfContents({ sections }: { sections: Section[] }) {
  const active = useActiveSection(sections);

  return (
    <nav
      aria-label="On this page"
      className="hidden animate-rise lg:sticky lg:top-12 lg:col-start-10 lg:col-end-13 lg:block lg:self-start lg:pl-12"
      style={riseDelay(1)}
    >
      <h2 className="text-faint">On this page</h2>
      <ul className="mt-2">
        {sections.map(({ id, title }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active === id ? "location" : undefined}
              className={`block py-0.5 transition-colors ${
                active === id ? "font-medium text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
