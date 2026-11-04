import Column, { GRID } from "@/components/Column";
import LinkList, { type LinkItem } from "@/components/LinkList";
import PaperRun from "@/game/PaperRun";
import { riseDelay } from "@/lib/Rise";
import { CONTACT_EMAIL, SITE_FULL_NAME, SITE_ROLE } from "@/lib/Site";

const LINKS: LinkItem[] = [
  { label: "Lab", href: "/lab" },
  { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}`, external: true },
];

export default function Home() {
  return (
    <>
      <Column guides>
        <header className="mb-8 animate-rise" style={riseDelay(0)}>
          <h1 className="leading-snug font-medium">{SITE_FULL_NAME}</h1>
          <p className="leading-snug text-muted">{SITE_ROLE}</p>
        </header>

        {/* Exactly four grid columns wide, so both its edges sit on grid lines */}
        <p className="animate-rise text-pretty text-muted sm:col-span-4 sm:max-w-none" style={riseDelay(1)}>
          I&apos;m a frontend engineer and a perfectionist, happiest when an interface looks, moves and feels exactly
          right.
        </p>

        <nav aria-label="Links" className="mt-12 animate-rise sm:mt-16" style={riseDelay(2)}>
          <LinkList links={LINKS} />
        </nav>
      </Column>
      {/* A small game along the bottom. It starts where the text does and
          stops as far from the right edge as the text starts from the left,
          so it sits centred on the grid at every width. It rises within the
          padding under it: rising from below the page's edge would make the
          page scroll for a moment */}
      <div className={`${GRID} relative pb-6`}>
        <div
          className="col-span-4 animate-rise sm:col-start-2 sm:col-end-12 lg:col-start-3 lg:col-end-11 xl:col-start-4 xl:col-end-10"
          style={riseDelay(3)}
        >
          <PaperRun />
        </div>
      </div>
    </>
  );
}
