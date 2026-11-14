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
import { createHand, setIn } from "./Hand";
import { COPY, FLOW, LOOK, QUAD, TOUCH_FRAGMENT, TOUCH_VERTEX } from "./Shaders";

// The home page's painting, wet. The paint is kept as a picture of how thick
// it lies and how wet it is, a pixel of it for each pixel of the screen; a
// hand (see Hand) keeps pouring into it; a shader moves it on, moment by
// moment (wet paint runs, levels, dries, and in time sinks away); and another
// shows it, lit (see Shaders). The pointer carries a lamp over it, and,
// pressed, pours too

// The most pixels the paint is kept in: past this it is kept coarser
const MOST = 2_600_000;
// The most touches of paint laid down in one frame
const TOUCHES = 2048;
// Seconds for paint to dry; then how fast it sinks away (a share of it a
// second, and a little besides, so that what is thin does go)
const DRY = 30;
const FADE = 1 / 95;
const SINK = 0.0007;
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
    uTexel: { value: texel },
    uStep: { value: 0 },
    uFlow: { value: 0 },
    uDry: { value: 1 / DRY },
    uFade: { value: FADE },
    uSink: { value: SINK },
  });
  const look = shader(LOOK, {
    uState: { value: null },
    uTexel: { value: texel },
    uLight: { value: new Vector3(0, 0, 1) },
    uPointer: { value: new Vector3(0, 0, 0) },
    uRelief: { value: RELIEF },
  });
  const copy = shader(COPY, { uState: { value: null } });

  // The touches of paint to lay down this frame
  const spots = new Float32Array(TOUCHES * 3);
  const pours = new Float32Array(TOUCHES * 2);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(spots, 3).setUsage(DynamicDrawUsage));
  geometry.setAttribute("pour", new BufferAttribute(pours, 2).setUsage(DynamicDrawUsage));
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
  // Pixels of the paint for each of the page's, and the painting's box on it
  let pixels = 1;
  let box = setIn(1, 1);

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
    const [was, spare] = [now, next];
    now = canvasFor(w, h);
    next = canvasFor(w, h);
    for (const target of [now, next]) {
      renderer.setRenderTarget(target);
      renderer.clear();
    }
    // The paint there was, stretched to the new canvas
    if (was) draw(copy, was, now);
    was?.dispose();
    spare?.dispose();
    size.set(w, h);
    texel.set(1 / w, 1 / h);
    box = setIn(width, height);
    // Paint runs as fast on the page whatever it is kept at
    flow.uniforms.uFlow.value = 0.2 * pixels;
  };

  // A touch of paint, in the page's pixels from the wall's top left
  const lay = (x: number, y: number, radius: number, thick: number, drop = false) => {
    if (count === TOUCHES) return;
    spots[count * 3] = x * pixels;
    spots[count * 3 + 1] = size.y - y * pixels;
    spots[count * 3 + 2] = Math.max(0.6, radius * pixels);
    pours[count * 2] = thick;
    pours[count * 2 + 1] = drop ? 1 : 0;
    count++;
  };
  const hand = createHand((x, y, radius, thick, drop) => {
    const [px, py] = box.place(x, y);
    lay(px, py, radius * box.scale, thick, drop);
  });

  let time = 0;
  // One moment on: the hand moves, the paint flows, the new paint lands
  const advance = (dt: number) => {
    if (!now || !next) return;
    time += dt;
    hand.move(dt);
    flow.uniforms.uStep.value = dt;
    draw(flow, now, next);
    if (count) {
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.pour.needsUpdate = true;
      geometry.setDrawRange(0, count);
      renderer.render(pouring, camera);
      count = 0;
    }
    [now, next] = [next, now];
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
      lay(pointer.x + (Math.random() - 0.5) * 4, pointer.y + (Math.random() - 0.5) * 4, 4, 0.4, true);
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
    // A while of it at once, unseen: for looking at it some way in
    skip(seconds: number) {
      for (let t = 0; t < seconds; t += 1 / 60) advance(1 / 60);
      show(0);
    },
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
      geometry.dispose();
      (touches.material as ShaderMaterial).dispose();
      quad.geometry.dispose();
      for (const material of [flow, look, copy]) material.dispose();
      renderer.dispose();
    },
  };
}
