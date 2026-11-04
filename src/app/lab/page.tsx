import type { Metadata } from "next";
import Link from "next/link";
import LabCover from "@/components/LabCover";
import { LAB_COLUMN } from "@/components/LabPage";
import TopNav from "@/components/TopNav";
import { riseDelay } from "@/lib/Rise";
import { LAB_DESCRIPTION, LABS } from "./Labs";

export const metadata: Metadata = { title: "Lab", description: LAB_DESCRIPTION };

export default function Lab() {
  return (
    <main className={LAB_COLUMN}>
      <TopNav back={{ label: "Home", href: "/" }} current="Lab" />

      <header className="mt-5 animate-rise" style={riseDelay(1)}>
        <h1 className="leading-snug font-medium">Lab</h1>
        <p className="mt-1 text-pretty text-muted">{LAB_DESCRIPTION}</p>
      </header>

      <ul className="mt-10 grid gap-x-4 gap-y-8 sm:grid-cols-2">
        {LABS.map(({ slug, title, experiments }, i) => (
          <li key={slug} className="animate-rise" style={riseDelay(2 + i)}>
            <Link href={`/lab/${slug}`} className="group block">
              {/* A live preview playing through the page's demos, but only a
                    picture of them: not focusable, not pressable, so the whole
                    card is one link */}
              <div
                inert
                className="pointer-events-none relative aspect-square overflow-hidden rounded-[4px] bg-surface transition-colors duration-200 group-hover:bg-[color-mix(in_srgb,var(--surface),var(--foreground)_3%)]"
              >
                <LabCover demos={experiments.map(({ demo }) => demo)} />
              </div>
              <p className="mt-2 font-medium">{title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
