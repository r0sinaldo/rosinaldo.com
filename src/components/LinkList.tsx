import Link from "next/link";

type LinkItem = { label: string; href: string };

// Links within the site, one under another, each with an arrow that leans on
// under the pointer
export default function LinkList({ links }: { links: LinkItem[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {links.map(({ label, href }) => (
        <li key={href}>
          <Link href={href} className="group inline-flex items-center gap-1 link">
            {label}
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
        </li>
      ))}
    </ul>
  );
}
