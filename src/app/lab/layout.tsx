import { GRID } from "@/components/Column";

// One column centred on the grid, as a page to read; each page brings its
// own way back. The top is a little short, for the padding of that bar
export default function LabLayout({ children }: LayoutProps<"/lab">) {
  return <div className={`${GRID} flex-1 content-start pt-9 pb-12 sm:pt-21 sm:pb-24`}>{children}</div>;
}
