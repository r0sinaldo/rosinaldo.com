import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LabPage from "@/components/LabPage";
import { LABS } from "../Labs";

type Params = PageProps<"/lab/[slug]">["params"];

export function generateStaticParams() {
  return LABS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const lab = LABS.find((l) => l.slug === slug);
  return lab ? { title: lab.title, description: lab.description } : {};
}

// Reading params suspends; inside a boundary, navigating between pages stays
// instant instead of waiting on it
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <PageContent params={params} />
    </Suspense>
  );
}

async function PageContent({ params }: { params: Params }) {
  const { slug } = await params;
  const lab = LABS.find((l) => l.slug === slug);
  if (!lab) notFound();
  return <LabPage lab={lab} />;
}
