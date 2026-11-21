import {
  AddEquation,
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  DynamicDrawUsage,
  HalfFloatType,
  LinearFilter,
  MaxEquation,
  Mesh,
  NormalBlending,
  OneFactor,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { rgbChannels } from "@/lib/Tokens";
import { createHand } from "./Hand";
import { PAINTS, WHITE } from "./Palette";
import { hangsBeside, setIn } from "./Pour";
import { COPY, FLOW, LOOK, QUAD, TINT_FRAGMENT, TOUCH_FRAGMENT, TOUCH_VERTEX } from "./Shaders";

// The paints as the shaders take them: 0 to 1 a channel, as they are shown
const TINTS = PAINTS.map(({ colour }) => rgbChannels(colour).map((channel) => channel / 255));

// The home page's painting, wet. The paint is kept as a picture of how thick
// it lies and how wet it is, a pixel of it for each pixel of the screen; a
// hand (see Hand) keeps pouring into it, and its runs crawl down it; a shader
// moves it on, moment by moment (it dries, and in time sinks away); and
// another shows it, lit (see Shaders). The pointer carries a lamp over it, and,
// pressed, pours too

// The most pixels the paint is kept in: past this it is kept coarser
const MOST = 2_600_000;
// The most touches of paint laid down in one frame
const TOUCHES = 2048;
// Seconds for paint to dry; then how fast it sinks away (a share of it a
// second, and a little besides, so that what is thin does go)
const DRY = 24;
const FADE = 1 / 38;
const SINK = 0.003;
// How often the paint dries a step (s). Not every frame: the paint is kept
// in half floats, and a frame's worth of drying, taken off thick paint, is
// smaller than the gap between two of them, so it would be rounded away and
// thick paint would never go
const DRYING_STEP = 0.1;
// How steep the paint's relief is lit as
const RELIEF = 2.4;
// The lamp: how long it takes to go round (s), and how high it hangs
const ROUND = 42;
const HEIGHT = 0.9;

export function createWet(canvas: HTMLCanvasElement, wall: HTMLElement, onLost: () => void) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
  if (!renderer.extensions.has("EXT_color_buffer_float") && !renderer.extensions.has("EXT_color_buffer_half_float")) {
    renderer.dispose();
    throw new Error("No float canvases to keep the paint in");
  }
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(1);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new Mesh(new PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const stage = new Scene();
  stage.add(quad);

  const size = new Vector2(1, 1);
  const texel = new Vector2(1, 1);
  const shader = (fragmentShader: string, uniforms: ShaderMaterial["uniforms"]) =>
    new ShaderMaterial({ vertexShader: QUAD, fragmentShader, uniforms, depthTest: false, depthWrite: false });
  const flow = shader(FLOW, {
    uState: { value: null },
    uStep: { value: 0 },
    uDry: { value: 1 / DRY },
    uFade: { value: FADE },
    uSink: { value: SINK },
  });
  const look = shader(LOOK, {
    uState: { value: null },
    uColour: { value: null },
    uTexel: { value: texel },
    uLight: { value: new Vector3(0, 0, 1) },
    uPointer: { value: new Vector3(0, 0, 0) },
    uRelief: { value: RELIEF },
  });
  const copy = shader(COPY, { uState: { value: null } });

  // The touches of paint to lay down this frame
  const spots = new Float32Array(TOUCHES * 3);
  const pours = new Float32Array(TOUCHES * 2);
  const tints = new Float32Array(TOUCHES * 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(spots, 3).setUsage(DynamicDrawUsage));
  geometry.setAttribute("pour", new BufferAttribute(pours, 2).setUsage(DynamicDrawUsage));
  geometry.setAttribute("tint", new BufferAttribute(tints, 3).setUsage(DynamicDrawUsage));
  const touches = new Points(
    geometry,
    new ShaderMaterial({
      vertexShader: TOUCH_VERTEX,
      fragmentShader: TOUCH_FRAGMENT,
      uniforms: { uSize: { value: size } },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendEquationAlpha: MaxEquation,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneFactor,
    }),
  );
  touches.frustumCulled = false;
  const pouring = new Scene();
  pouring.add(touches);
  // The same touches again, laying their colour into the colour's picture
  const tinting = new Points(
    geometry,
    new ShaderMaterial({
      vertexShader: TOUCH_VERTEX,
      fragmentShader: TINT_FRAGMENT,
      uniforms: { uSize: { value: size } },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: NormalBlending,
    }),
  );
  tinting.frustumCulled = false;
  const colouring = new Scene();
  colouring.add(tinting);
  let count = 0;

  // The paint now, and a second canvas to work the next moment out on
  const canvasFor = (width: number, height: number) =>
    new WebGLRenderTarget(width, height, {
      type: HalfFloatType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
    });
  let now: WebGLRenderTarget | null = null;
  let next: WebGLRenderTarget | null = null;
  let colours: WebGLRenderTarget | null = null;
  // Pixels of the paint for each of the page's, and the painting's box on it
  let pixels = 1;
  let beside = true;
  let box = setIn(1, 1, beside);

  const draw = (material: ShaderMaterial, from: WebGLRenderTarget, to: WebGLRenderTarget | null) => {
    material.uniforms.uState.value = from.texture;
    quad.material = material;
    renderer.setRenderTarget(to);
    renderer.render(stage, camera);
  };

  const fit = () => {
    const { clientWidth: width, clientHeight: height } = wall;
    if (!width || !height) return;
    pixels = Math.min(2, Math.max(1, window.devicePixelRatio));
    pixels = Math.min(pixels, Math.sqrt(MOST / (width * height)));
    const w = Math.round(width * pixels);
    const h = Math.round(height * pixels);
    if (now && w === size.x && h === size.y) return;
    renderer.setSize(w, h, false);
    const [was, spare, wasColours] = [now, next, colours];
    now = canvasFor(w, h);
    next = canvasFor(w, h);
    colours = canvasFor(w, h);
    for (const target of [now, next, colours]) {
      renderer.setRenderTarget(target);
      renderer.clear();
    }
    // The paint there was, and its colours, stretched to the new canvas;
    // unless the painting has moved (from beside the words to above them, or
    // back), when it starts again
    const wasBeside = beside;
    beside = hangsBeside(wall);
    const moved = beside !== wasBeside;
    if (was && !moved) draw(copy, was, now);
    if (wasColours && !moved) draw(copy, wasColours, colours);
    was?.dispose();
    spare?.dispose();
    wasColours?.dispose();
    size.set(w, h);
    texel.set(1 / w, 1 / h);
    box = setIn(width, height, beside);
  };

  // A touch of paint, in the page's pixels from the wall's top left
  const lay = (x: number, y: number, radius: number, thick: number, paint: number, drop = false) => {
    if (count === TOUCHES) return;
    tints.set(TINTS[paint], count * 3);
    spots[count * 3] = x * pixels;
    spots[count * 3 + 1] = size.y - y * pixels;
    spots[count * 3 + 2] = Math.max(0.6, radius * pixels);
    pours[count * 2] = thick;
    pours[count * 2 + 1] = drop ? 1 : 0;
    count++;
  };
  const hand = createHand((x, y, radius, thick, paint, drop) => {
    const [px, py] = box.place(x, y);
    lay(px, py, radius * box.scale, thick, paint, drop);
  });

  let time = 0;
  let drying = 0;
  // One moment on: the hand moves, the paint dries (now and then), the new
  // paint lands
  const advance = (dt: number) => {
    if (!now || !next) return;
    time += dt;
    hand.move(dt);
    drying += dt;
    if (drying >= DRYING_STEP) {
      flow.uniforms.uStep.value = drying;
      draw(flow, now, next);
      [now, next] = [next, now];
      drying = 0;
    }
    if (count) {
      renderer.setRenderTarget(now);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.pour.needsUpdate = true;
      geometry.attributes.tint.needsUpdate = true;
      geometry.setDrawRange(0, count);
      renderer.render(pouring, camera);
      renderer.setRenderTarget(colours);
      renderer.render(colouring, camera);
      count = 0;
    }
  };

  const pointer = { x: 0, y: 0, over: false, down: false, lit: 0 };
  const show = (dt: number) => {
    if (!now) return;
    const angle = (time / ROUND) * Math.PI * 2;
    look.uniforms.uLight.value.set(Math.cos(angle), Math.sin(angle), HEIGHT).normalize();
    // The pointer's lamp comes on and goes off softly
    pointer.lit += ((pointer.over ? 1 : 0) - pointer.lit) * Math.min(1, dt * 5);
    look.uniforms.uPointer.value.set(pointer.x * pixels, size.y - pointer.y * pixels, pointer.lit);
    renderer.setRenderTarget(null);
    renderer.clear();
    look.uniforms.uColour.value = colours?.texture ?? null;
    draw(look, now, null);
  };

  // The pointer, in the wall's own pixels. Pressed and dragged over the
  // painting (a mouse or a pen: a finger there scrolls the page), it pours:
  // a thin line moved fast, a heavy one moved slowly
  const isControl = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest("a, button, input, textarea, select, h1, p");
  const onMove = (event: PointerEvent) => {
    const rect = wall.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    pointer.over = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    if (pointer.down) {
      const far = Math.hypot(x - pointer.x, y - pointer.y);
      const fast = Math.min(1, far / 28);
      const radius = 3.6 - 2.8 * fast;
      for (let i = 1, n = Math.ceil(far * 2); i <= n; i++) {
        const t = i / n;
        lay(
          pointer.x + (x - pointer.x) * t,
          pointer.y + (y - pointer.y) * t,
          radius,
          (0.34 - 0.2 * fast) / (6 * radius),
          WHITE,
        );
      }
    }
    pointer.x = x;
    pointer.y = y;
  };
  const onDown = (event: PointerEvent) => {
    onMove(event);
    if (event.button !== 0 || event.pointerType === "touch" || !pointer.over || isControl(event.target)) return;
    // Not a selection of the page's text
    event.preventDefault();
    pointer.down = true;
    // Where the paint first lands
    for (let i = 0; i < 4; i++)
      lay(pointer.x + (Math.random() - 0.5) * 4, pointer.y + (Math.random() - 0.5) * 4, 4, 0.4, WHITE, true);
  };
  const onUp = () => {
    pointer.down = false;
  };
  const onLeave = () => {
    pointer.over = false;
  };

  let frame = 0;
  let last = 0;
  const loop = (at: number) => {
    frame = requestAnimationFrame(loop);
    // After a pause (a slow frame, a tab come back to) it picks up, not jumps
    const dt = last ? Math.min(at - last, 50) / 1000 : 1 / 60;
    last = at;
    advance(dt);
    show(dt);
  };
  // Away from the tab, it stops where it is, and picks up from there
  const onVisibility = () => {
    cancelAnimationFrame(frame);
    last = 0;
    if (!document.hidden) frame = requestAnimationFrame(loop);
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    onLost();
  };

  const observer = new ResizeObserver(fit);
  observer.observe(wall);
  fit();
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  document.documentElement.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost);
  frame = requestAnimationFrame(loop);

  return {
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      now?.dispose();
      next?.dispose();
      colours?.dispose();
      geometry.dispose();
      (touches.material as ShaderMaterial).dispose();
      (tinting.material as ShaderMaterial).dispose();
      quad.geometry.dispose();
      for (const material of [flow, look, copy]) material.dispose();
      renderer.dispose();
    },
  };
}
