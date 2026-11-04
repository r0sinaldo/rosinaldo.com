"use client";

import { type CSSProperties, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { CITY_HEIGHT, CITY_LABEL, CITY_WIDTH, cityCanvas } from "./City";

// What every skeleton variation shares: the post they all load, laid out the
// same way in each so they can be compared; its placeholder and its content,
// which share every measurement so nothing moves when one replaces the other;
// the plain handovers; the pretend load; and the frame around it all

export const POST = {
  initials: "RO",
  name: "Rosinaldo",
  handle: "@r0sinaldo · 2m",
  lines: ["A window for every story."],
};

const AVATAR = 36;
// Where the name and handle start, for the shared light (see .bone)
export const TEXT_X = AVATAR + 12;

// How long the placeholder's bars are: about as long as their text
export const BARS = { name: 80, handle: 88, lines: [176] };

// The placeholder's pieces, positioned in the slots of Layout
export const BONES = {
  avatar: <Bone className="inset-0 rounded-full" />,
  name: <Bone className="top-1 h-3 rounded-full" x={TEXT_X} style={{ width: BARS.name }} />,
  handle: <Bone className="top-[3px] h-2.5 rounded-full" x={TEXT_X} style={{ width: BARS.handle }} />,
  lines: BARS.lines.map((width, i) => <Bone key={i} className="top-1 h-3 rounded-full" style={{ width }} />),
  picture: <Bone className="inset-0 rounded-[10px]" />,
};

// The content's pieces, in the same slots
export const CONTENT = {
  avatar: (
    <div className="grid size-full place-items-center rounded-full bg-[linear-gradient(135deg,#f6a35b,#e0607e)] text-xs font-semibold text-white">
      {POST.initials}
    </div>
  ),
  name: <span className="block w-max text-sm leading-5 font-medium">{POST.name}</span>,
  handle: <span className="block w-max text-xs leading-4 text-faint">{POST.handle}</span>,
  lines: POST.lines.map((line) => (
    <span key={line} className="block w-max text-sm leading-5 text-muted">
      {line}
    </span>
  )),
  picture: <Picture />,
};

// A placeholder block. The light that sweeps it is shared by every bone of a
// post, offset by where the bone starts (`x`), so it reads as one light
// passing over the whole placeholder rather than each block on its own
export function Bone({ className, x = 0, style }: { className: string; x?: number; style?: CSSProperties }) {
  return <div className={`bone absolute ${className}`} style={{ "--x": `${x}px`, ...style } as CSSProperties} />;
}

export function Picture() {
  return (
    <div
      role="img"
      aria-label={CITY_LABEL}
      className="size-full rounded-[10px] bg-size-[100%_100%]"
      style={{ backgroundImage: "var(--picture)" }}
    />
  );
}

type Slots = { avatar: ReactNode; name: ReactNode; handle: ReactNode; lines: ReactNode[]; picture: ReactNode };

// The post's layout: fixed slots, each sized for its content, with the bone
// and the content laid one over the other inside it
export function Layout({ avatar, name, handle, lines, picture }: Slots) {
  return (
    <div className="w-[280px]">
      <div className="flex items-center gap-3">
        <div className="relative size-9 shrink-0">{avatar}</div>
        <div className="flex w-[232px] flex-col">
          <div className="relative h-5">{name}</div>
          <div className="relative h-4">{handle}</div>
        </div>
      </div>
      <div className="mt-3">
        {lines.map((line, i) => (
          <div key={i} className="relative h-5">
            {line}
          </div>
        ))}
      </div>
      <div className="relative mt-3 h-[120px]">{picture}</div>
    </div>
  );
}

// The whole post, as its placeholder and as its content. The content's pieces
// are marked by part, so the post can be drawn from it (see Raster)
export const BONE_LAYOUT = (
  <Layout avatar={BONES.avatar} name={BONES.name} handle={BONES.handle} lines={BONES.lines} picture={BONES.picture} />
);

export const CONTENT_LAYOUT = (
  <Layout
    avatar={
      <div data-part="avatar" className="absolute inset-0">
        {CONTENT.avatar}
      </div>
    }
    name={
      <div data-part="text" className="absolute inset-0">
        {CONTENT.name}
      </div>
    }
    handle={
      <div data-part="text" className="absolute inset-0">
        {CONTENT.handle}
      </div>
    }
    lines={CONTENT.lines.map((line, i) => (
      <div key={i} data-part="text" className="absolute inset-0">
        {line}
      </div>
    ))}
    picture={
      <div data-part="picture" className="absolute inset-0">
        {CONTENT.picture}
      </div>
    }
  />
);

// The plainest handover: the bone fades out as the content fades in, a touch
// blurred and low, settling into place
export function Swap({
  shown,
  delay = 0,
  bone,
  children,
}: {
  shown: boolean;
  delay?: number;
  bone: ReactNode;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const settle = shown || reducedMotion;
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          opacity: shown ? 0 : 1,
          transition: shown ? `opacity 300ms ease-out ${delay}ms` : `opacity 200ms ease-out`,
        }}
      >
        {bone}
      </div>
      <div
        className="absolute inset-0"
        style={{
          opacity: shown ? 1 : 0,
          filter: settle ? "none" : "blur(4px)",
          translate: settle ? "0 0" : "0 3px",
          transition: shown
            ? `opacity 420ms ease-out ${delay}ms, filter 420ms ease-out ${delay}ms, translate 500ms cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms`
            : `opacity 150ms ease-out`,
        }}
      >
        {children}
      </div>
    </>
  );
}

// The whole post handing over in the plainest way, for when motion is
// reduced
export function Crossfade({ shown }: { shown: boolean }) {
  return (
    <Layout
      avatar={
        <Swap shown={shown} bone={BONES.avatar}>
          {CONTENT.avatar}
        </Swap>
      }
      name={
        <Swap shown={shown} bone={BONES.name}>
          {CONTENT.name}
        </Swap>
      }
      handle={
        <Swap shown={shown} bone={BONES.handle}>
          {CONTENT.handle}
        </Swap>
      }
      lines={BONES.lines.map((bone, i) => (
        <Swap key={i} shown={shown} bone={bone}>
          {CONTENT.lines[i]}
        </Swap>
      ))}
      picture={
        <Swap shown={shown} bone={BONES.picture}>
          {CONTENT.picture}
        </Swap>
      }
    />
  );
}

const REPLAY = 0.5;

export type Loading = {
  root: RefObject<HTMLDivElement | null>;
  // How many of the `times` have passed
  arrived: number;
  loading: boolean;
  replay: () => void;
};

// A pretend load: things arrive at the given times (ms), counted from when the
// post first comes into view, so it is seen and not over before anyone
// scrolls to it
export function useLoading(times: readonly number[]): Loading {
  const root = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [run, setRun] = useState(0);
  const [arrived, setArrived] = useState(0);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!seen) return;
    // Loaded again, it has been seen already: no need to wait as long
    const pace = run > 0 ? REPLAY : 1;
    const timers = times.map((time, i) => setTimeout(() => setArrived(i + 1), time * pace));
    return () => timers.forEach(clearTimeout);
  }, [seen, run, times]);

  return {
    root,
    arrived,
    loading: arrived < times.length,
    replay: () => {
      setArrived(0);
      setRun((n) => n + 1);
    },
  };
}

// Paints the picture once and hands it to the post as CSS variables: the
// picture itself, a tiny copy of it (for Blur-up), and its average colour
export function usePicture(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const picture = cityCanvas();
    // A few pixels each way, in the picture's own proportions
    const tiny = document.createElement("canvas");
    tiny.width = Math.round(CITY_WIDTH / 20);
    tiny.height = Math.round(CITY_HEIGHT / 20);
    const context = tiny.getContext("2d")!;
    context.drawImage(picture, 0, 0, tiny.width, tiny.height);
    const pixels = context.getImageData(0, 0, tiny.width, tiny.height).data;
    const tone = [0, 0, 0];
    for (let i = 0; i < pixels.length; i += 4) for (let c = 0; c < 3; c++) tone[c] += pixels[i + c];
    const count = pixels.length / 4;
    element.style.setProperty("--picture", `url(${picture.toDataURL()})`);
    element.style.setProperty("--picture-tiny", `url(${tiny.toDataURL()})`);
    element.style.setProperty("--picture-tone", `rgb(${tone.map((sum) => Math.round(sum / count)).join(" ")})`);
  }, [root]);
}

// Measures each line of text in the post ([data-text] inside a [data-line])
// and gives its slot the width as --w, for skeletons that take the exact
// shape of their text. Again once the font has loaded, as that changes it
export function useTextWidths(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let current = true;
    const measure = () => {
      if (!current) return;
      element.querySelectorAll<HTMLElement>("[data-line]").forEach((line) => {
        const text = line.querySelector<HTMLElement>("[data-text]");
        if (text) line.style.setProperty("--w", `${text.offsetWidth}px`);
      });
    };
    measure();
    document.fonts.ready.then(measure);
    return () => {
      current = false;
    };
  }, [root]);
}

// The demo's frame: the post, the light sweeping its bones while it loads,
// and under it a line for news and a way to load it again
type FrameProps = Pick<Loading, "root" | "loading" | "replay"> & { status?: ReactNode; children: ReactNode };

export function Frame({ root, loading, replay, status, children }: FrameProps) {
  return (
    <div ref={root} className={`flex flex-col items-center ${loading ? "shimmering" : ""}`}>
      {children}
      <div className="mt-4 flex h-5 w-[280px] items-center justify-between gap-4 text-sm text-faint">
        <span aria-live="polite" className="min-w-0 truncate">
          {status}
        </span>
        <button
          type="button"
          onClick={replay}
          disabled={loading}
          className="-mr-1 inline-flex shrink-0 cursor-pointer items-center gap-1 rounded px-1 transition-[color,opacity] duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-faint disabled:cursor-default disabled:opacity-40 disabled:hover:text-faint"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 8a5 5 0 1 1-1.5-3.55M13 3v2.5h-2.5" />
          </svg>
          Load again
        </button>
      </div>
    </div>
  );
}
