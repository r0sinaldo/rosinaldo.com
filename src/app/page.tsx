import type { Metadata } from "next";
import Link from "next/link";
import Painting from "@/art/Painting";
import { GRID, Guides } from "@/components/Column";
import LabCover from "@/components/LabCover";
import type { DemoName } from "@/experiments/Demos";
import { riseDelay } from "@/lib/Rise";
import { CONTACT_EMAIL, SITE_FULL_NAME, SITE_ROLE } from "@/lib/Site";
import { LAB_DESCRIPTION } from "./lab/Labs";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// What the Lab's card plays, round and round: a few of its demos, the light
// ones (none that need WebGL, so the home page never loads three.js)
const SHOWN: DemoName[] = [
  "hold-classic",
  "skeleton-one-light",
  "hold-from-your-finger",
  "skeleton-ink",
  "hold-building-tension",
  "skeleton-morph",
];

// The grid, drawn exactly; the painting, poured over it; and the words, few
// and small, set on the grid's lines beside it
export default function Home() {
  return (
    <>
      <Guides />
      <Painting />
      <main className={`${GRID} relative flex-1 content-start pt-2 pb-10 sm:content-center sm:py-24`}>
        <div className="col-span-4 sm:col-start-2 sm:col-end-7 lg:col-end-6 xl:col-end-5">
          <header className="animate-rise" style={riseDelay(0)}>
            <h1 className="leading-snug font-medium">{SITE_FULL_NAME}</h1>
            <p className="leading-snug text-muted">{SITE_ROLE}</p>
          </header>

          <p className="mt-6 animate-rise text-pretty text-muted" style={riseDelay(1)}>
            Happiest when an interface looks, moves and feels exactly right.
          </p>

          {/* The proof of it: the Lab, playing. Only a picture of its demos
              (not focusable, not pressable), so the whole card is one link */}
          <Link href="/lab" className="group mt-10 block animate-rise" style={riseDelay(2)}>
            <div
              inert
              className="pointer-events-none relative aspect-video overflow-hidden rounded-[4px] bg-surface transition-colors duration-200 group-hover:bg-[color-mix(in_srgb,var(--surface),var(--foreground)_3%)]"
            >
              <LabCover demos={SHOWN} />
            </div>
            <p className="mt-3 flex items-center gap-1 font-medium">
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
            </p>
            <p className="text-pretty text-muted">{LAB_DESCRIPTION}</p>
          </Link>

          <p className="mt-10 animate-rise" style={riseDelay(3)}>
            <a href={`mailto:${CONTACT_EMAIL}`} className="link text-muted">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
