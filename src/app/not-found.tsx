import type { Metadata } from "next";
import Column from "@/components/Column";
import LinkList from "@/components/LinkList";
import { riseDelay } from "@/lib/Rise";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <Column guides>
      <header className="mb-8 animate-rise" style={riseDelay(0)}>
        <h1 className="leading-snug font-medium">Page not found</h1>
        <p className="leading-snug text-muted">This page doesn&apos;t exist, or it has moved.</p>
      </header>

      <nav aria-label="Links" className="animate-rise" style={riseDelay(1)}>
        <LinkList links={[{ label: "Home", href: "/" }]} />
      </nav>
    </Column>
  );
}
