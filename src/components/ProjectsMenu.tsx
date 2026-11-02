"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { riseDelay } from "@/lib/Rise";

type MenuSection = { id: string; title: string; projects: { slug: string; title: string }[] };

export default function ProjectsMenu({ sections }: { sections: MenuSection[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Projects"
      className="col-span-4 min-w-0 animate-rise sm:sticky sm:top-12 sm:col-span-3 sm:self-start sm:pr-6"
      style={riseDelay(0)}
    >
      <Link
        href="/"
        className="-ml-1 inline-flex items-center gap-1 text-muted transition-colors hover:text-foreground"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
          <path d="M10 4L6 8l4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Home
      </Link>

      {sections.map(({ id, title, projects }) => (
        <div key={id} className="mt-6 sm:mt-10">
          <h2 className="text-faint">{title}</h2>
          {/* On phones the names run in one row that scrolls sideways; the negative
              margin lets it scroll edge to edge past the page's padding */}
          <ul className="-mx-6 mt-2 flex [scrollbar-width:none] gap-x-5 overflow-x-auto px-6 sm:mx-0 sm:flex-col sm:overflow-visible sm:px-0">
            {projects.map(({ slug, title }) => {
              const href = `/projects/${slug}`;
              const current = pathname === href;
              return (
                <li key={slug} className="shrink-0">
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={`block py-0.5 whitespace-nowrap transition-colors ${
                      current ? "font-medium text-foreground" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
