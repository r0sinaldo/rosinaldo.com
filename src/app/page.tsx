import type { Metadata } from "next";
import Link from "next/link";
import Living from "@/art/Living";
import { GRID, Guides } from "@/components/Column";
import { riseDelay } from "@/lib/Rise";
import { CONTACT_EMAIL, SITE_FULL_NAME, SITE_ROLE } from "@/lib/Site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// The grid, drawn exactly; the painting, poured over it; and the words, few
// and small, set on the grid's lines: under the painting and centred on phones
// and on tablets held upright, beside it where there is room (see WALL)
export default function Home() {
  return (
    <>
      <Guides />
      <Living />
      <main
        className={`${GRID} relative flex-1 content-start pt-2 pb-14 text-center wide:content-center wide:py-24 wide:text-left`}
      >
        <div className="col-span-4 sm:col-start-3 sm:col-end-11 md:col-start-4 md:col-end-10 wide:col-start-2 wide:col-end-6 wide:xl:col-end-5">
          <header className="animate-rise" style={riseDelay(0)}>
            {/* The name leads, a step above everything else; the role sits
                just under it, at the text's size and quieter than the rest */}
            <h1 className="page-title">{SITE_FULL_NAME}</h1>
            <p className="mt-1 leading-snug text-faint">{SITE_ROLE}</p>
          </header>

          {/* What I care about: said, not noted, so a step brighter than the
              notes around it */}
          <p className="mt-6 animate-rise text-pretty text-foreground/80" style={riseDelay(1)}>
            Happiest when an interface looks, moves and feels exactly right.
          </p>

          {/* Where to go from here: the Lab, the proof of it, and a way to
              write. Two short lines, kept together */}
          <div className="mt-8 flex animate-rise flex-col items-center gap-2 wide:items-start" style={riseDelay(2)}>
            <Link href="/lab" className="group flex items-center gap-1 font-medium focus-visible:outline-offset-3">
              Lab
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="size-3.5 text-faint transition-[translate,color] duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-foreground"
              >
                <path
                  d="M6 4l4 4-4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="link">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
