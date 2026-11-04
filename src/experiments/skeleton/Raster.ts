import { useEffect, useRef, useState } from "react";
import { rgbChannels, readTokens } from "@/lib/Tokens";
import { cityCanvas } from "./City";

// The post, drawn into canvases for the effects that redraw it: what it
// shows, where its pieces and its bones are. It is drawn from the laid-out
// DOM, so it matches the real post to the pixel and the handover to it at the
// end cannot be seen

// Room around the post for what spills past its edges (sagging, drifting,
// shadows)
export const MARGIN = 24;

export type Raster = {
  // CSS pixels of the whole canvas, post and margin
  width: number;
  height: number;
  scale: number;
  // The post's rectangle within it
  post: Box;
  // The content, on transparent
  content: HTMLCanvasElement;
  // The bones, white on transparent
  bones: HTMLCanvasElement;
  // Where each piece of the content is, top to bottom
  parts: Part[];
  background: [number, number, number];
  foreground: [number, number, number];
};

type Box = { x: number; y: number; width: number; height: number };
export type Part = Box & { kind: "avatar" | "text" | "picture" };

function createCanvas(width: number, height: number, scale: number) {
  const element = document.createElement("canvas");
  element.width = Math.round(width * scale);
  element.height = Math.round(height * scale);
  const context = element.getContext("2d")!;
  context.scale(scale, scale);
  return { element, context };
}

// Where an element sits in the canvas, in CSS pixels, undoing any scale the
// post is shown at (the lab index shows it shrunk)
function locate(origin: DOMRect, ratio: number) {
  return (element: Element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: (rect.left - origin.left) / ratio + MARGIN,
      y: (rect.top - origin.top) / ratio + MARGIN,
      width: rect.width / ratio,
      height: rect.height / ratio,
    };
  };
}

// Text drawn where CSS draws it: the font's box centred in the line
function drawText(context: CanvasRenderingContext2D, element: HTMLElement, x: number, y: number) {
  const style = getComputedStyle(element);
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.fillStyle = style.color;
  context.textBaseline = "alphabetic";
  const metrics = context.measureText(element.textContent ?? "");
  const ascent = metrics.fontBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent;
  const line = parseFloat(style.lineHeight);
  context.fillText(element.textContent ?? "", x, y + (line - ascent - descent) / 2 + ascent);
}

function rasterize(content: HTMLElement, bones: HTMLElement): Raster {
  const origin = content.getBoundingClientRect();
  const ratio = origin.width / content.offsetWidth || 1;
  const at = locate(origin, ratio);
  const width = content.offsetWidth + MARGIN * 2;
  const height = content.offsetHeight + MARGIN * 2;
  const scale = Math.max(2, Math.ceil(window.devicePixelRatio));

  const shown = createCanvas(width, height, scale);
  const c = shown.context;

  const avatar = content.querySelector<HTMLElement>("[data-part=avatar] > *")!;
  const a = at(avatar);
  const gradient = c.createLinearGradient(a.x, a.y, a.x + a.width, a.y + a.height);
  gradient.addColorStop(0, "#f6a35b");
  gradient.addColorStop(1, "#e0607e");
  c.fillStyle = gradient;
  c.beginPath();
  c.arc(a.x + a.width / 2, a.y + a.height / 2, a.width / 2, 0, Math.PI * 2);
  c.fill();
  c.textAlign = "center";
  drawText(c, avatar, a.x + a.width / 2, a.y + (a.height - parseFloat(getComputedStyle(avatar).lineHeight)) / 2);
  c.textAlign = "left";

  const parts: Part[] = [{ kind: "avatar", ...a }];
  content.querySelectorAll<HTMLElement>("[data-part=text] > *").forEach((span) => {
    const box = at(span);
    drawText(c, span, box.x, box.y);
    parts.push({ kind: "text", ...box });
  });

  const picture = at(content.querySelector("[data-part=picture] > *")!);
  parts.push({ kind: "picture", ...picture });
  c.save();
  c.beginPath();
  c.roundRect(picture.x, picture.y, picture.width, picture.height, 10);
  c.clip();
  c.drawImage(cityCanvas(), picture.x, picture.y, picture.width, picture.height);
  c.restore();

  const placeholder = createCanvas(width, height, scale);
  placeholder.context.fillStyle = "#fff";
  bones.querySelectorAll(".bone").forEach((bone) => {
    const box = at(bone);
    const radius = Math.min(parseFloat(getComputedStyle(bone).borderTopLeftRadius), box.width / 2, box.height / 2);
    placeholder.context.beginPath();
    placeholder.context.roundRect(box.x, box.y, box.width, box.height, radius);
    placeholder.context.fill();
  });

  const tokens = readTokens();
  // Shaders take colours as 0–1
  const unit = (hex: string) => rgbChannels(hex).map((c) => c / 255) as [number, number, number];
  return {
    width,
    height,
    scale,
    post: { x: MARGIN, y: MARGIN, width: content.offsetWidth, height: content.offsetHeight },
    content: shown.element,
    bones: placeholder.element,
    parts,
    background: unit(tokens.background),
    foreground: unit(tokens.foreground),
  };
}

// The post, drawn for the effect once its font is in, and again when the colour
// scheme changes. Put `content` on the laid-out content (CONTENT_LAYOUT) and
// `bones` on the laid-out placeholder (BONE_LAYOUT)
export function useRaster(enabled: boolean) {
  const content = useRef<HTMLDivElement>(null);
  const bones = useRef<HTMLDivElement>(null);
  const [raster, setRaster] = useState<Raster | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    const draw = () => {
      if (current && content.current && bones.current) setRaster(rasterize(content.current, bones.current));
    };
    document.fonts.ready.then(draw);
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", draw);
    return () => {
      current = false;
      scheme.removeEventListener("change", draw);
    };
  }, [enabled]);
  return { content, bones, raster };
}
