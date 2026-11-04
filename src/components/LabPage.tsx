import type { Lab } from "@/app/lab/Labs";
import { DEMOS } from "@/experiments/Demos";
import { riseDelay } from "@/lib/Rise";
import DemoFrame from "./DemoFrame";
import TableOfContents from "./TableOfContents";
import TopNav from "./TopNav";

// The reading column: centred on the grid, narrower as the screen widens
export const LAB_COLUMN =
  "col-span-4 min-w-0 sm:col-start-3 sm:col-end-11 lg:col-start-4 lg:col-end-10 xl:col-start-5 xl:col-end-9";

export default function LabPage({ lab }: { lab: Lab }) {
  const { title, description, experiments } = lab;
  const sections = experiments.map(({ id, title }) => ({ id, title }));

  return (
    <>
      <main className={LAB_COLUMN}>
        <TopNav back={{ label: "Lab", href: "/lab" }} current={title} sections={sections} />

        <header className="mt-5 animate-rise" style={riseDelay(1)}>
          <h1 className="leading-snug font-medium">{title}</h1>
          <p className="mt-1 text-pretty text-muted">{description}</p>
        </header>

        {experiments.map(({ id, demo, title, description, note }, i) => {
          const Demo = DEMOS[demo];
          return (
            <section
              key={id}
              id={id}
              aria-labelledby={`${id}-title`}
              // When a link jumps to it, the section stops clear of the bar
              // at the top, with some air between them
              className="mt-16 animate-rise scroll-mt-20"
              style={riseDelay(2 + i)}
            >
              <h2 id={`${id}-title`} className="font-medium">
                <a href={`#${id}`} className="group">
                  {title}
                  <span aria-hidden className="ml-1.5 text-faint opacity-0 transition-opacity group-hover:opacity-100">
                    #
                  </span>
                </a>
              </h2>
              <p className="mt-1 text-pretty text-muted">{description}</p>
              <div className="mt-4">
                <DemoFrame>
                  <Demo />
                </DemoFrame>
              </div>
              <p className="mt-4 text-pretty text-muted">{note}</p>
            </section>
          );
        })}
      </main>

      <TableOfContents sections={sections} />
    </>
  );
}
