import type { Metadata } from "next";
import Link from "next/link";
import LabCover from "@/components/LabCover";
import { LAB_COLUMN } from "@/components/LabPage";
import TopNav from "@/components/TopNav";
import { riseDelay } from "@/lib/Rise";
import { LAB_DESCRIPTION, LABS } from "./Labs";

export const metadata: Metadata = {
  title: "Lab",
  description: LAB_DESCRIPTION,
  alternates: { canonical: "/lab" },
};

export default function Lab() {
  return (
    <main className={LAB_COLUMN}>
      <TopNav back={{ label: "Home", href: "/" }} current="Lab" />

      <header className="mt-5 animate-rise" style={riseDelay(1)}>
        <h1 className="page-title">Lab</h1>
        <p className="mt-2 text-pretty text-muted">{LAB_DESCRIPTION}</p>
      </header>

      <ul className="mt-10 grid gap-x-4 gap-y-8 sm:grid-cols-2">
        {LABS.map(({ slug, title, experiments }, i) => (
          <li key={slug} className="animate-rise" style={riseDelay(2 + i)}>
            <Link href={`/lab/${slug}`} className="group block rounded-[6px] focus-visible:outline-offset-4">
              {/* A live preview playing through the page's demos, but only a
                    picture of them: not focusable, not pressable, so the whole
                    card is one link */}
              <div
                inert
                className="pointer-events-none relative aspect-[4/3] overflow-hidden rounded-[4px] bg-surface transition-colors duration-200 group-hover:bg-[color-mix(in_srgb,var(--surface),var(--foreground)_3%)] sm:aspect-square"
              >
                <LabCover demos={experiments.map(({ demo }) => demo)} />
              </div>
              {/* What it is, and how much of it there is */}
              <p className="mt-2 flex items-baseline justify-between gap-3">
                <span className="font-medium">{title}</span>
                <span className="shrink-0 text-faint">
                  {experiments.length} {experiments.length === 1 ? "idea" : "ideas"}
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
