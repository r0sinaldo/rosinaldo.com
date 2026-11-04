import type { ReactNode } from "react";

type ColumnProps = {
  children: ReactNode;
  guides?: boolean;
};

// The layout grid every page sits on: 12 columns (4 on phones) inside a 24px
// margin. The guides draw this same grid, so text always lines up with them
export const GRID = "grid grid-cols-4 px-6 sm:grid-cols-12";
const GRID_COLUMNS = 12;
const PHONE_COLUMNS = 4;
const LINE = "border-[color-mix(in_srgb,var(--line)_25%,transparent)]";

// Where the content sits, starting one line further in as the screen widens.
// It is a subgrid: it shares the page's columns, so anything inside can span
// an exact number of them (e.g. sm:col-span-4) and still land on a line
const PLACEMENT =
  "grid-content grid grid-cols-subgrid col-span-4 sm:col-start-2 sm:col-end-12 lg:col-start-3 lg:col-end-11 xl:col-start-4 xl:col-end-13";

export default function Column({ children, guides = false }: ColumnProps) {
  return (
    <>
      {guides && (
        <div aria-hidden className={`pointer-events-none fixed inset-0 ${GRID}`}>
          {/* One line per column's left edge, plus a closing right edge: after
              the 4th column on phones (the rest are hidden), after the 12th above */}
          {Array.from({ length: GRID_COLUMNS }, (_, i) => (
            <div
              key={i}
              className={`border-l ${LINE} ${i === GRID_COLUMNS - 1 || i === PHONE_COLUMNS - 1 ? "border-r" : ""} ${
                i >= PHONE_COLUMNS ? "max-sm:hidden" : ""
              } ${i === PHONE_COLUMNS - 1 ? "sm:border-r-0" : ""}`}
            />
          ))}
        </div>
      )}
      {/* Fills the screen's height with its content in the middle of it */}
      <main className={`relative w-full flex-1 content-center py-12 sm:py-24 ${GRID}`}>
        <div className={PLACEMENT}>{children}</div>
      </main>
    </>
  );
}
