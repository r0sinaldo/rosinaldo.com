import Link from "next/link";

export type LinkItem = {
  label: string;
  href: string;
  // Leaves the site (an email, another site): shown with a diagonal arrow,
  // and web links open in a new tab
  external?: boolean;
};

export default function LinkList({ links }: { links: LinkItem[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {links.map(({ label, href, external }) => (
        <li key={href}>
          <Link
            href={href}
            className="group inline-flex items-center gap-1 link"
            {...(external && href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {label}
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className={`size-3.5 text-faint transition-[translate,color] duration-200 ease-out group-hover:text-foreground ${
                external ? "group-hover:translate-x-0.5 group-hover:-translate-y-0.5" : "group-hover:translate-x-0.5"
              }`}
            >
              <path
                d={external ? "M5.5 10.5l5-5M6.5 5.5h4v4" : "M6 4l4 4-4 4"}
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
