import * as THREE from "three";
import { type Box, IMAGE } from "../Layout";
import { buildAstronaut } from "./Model";
import { pose } from "./Pose";
import { type Figure, loadRigged } from "./Rigged";

// The 3D astronaut drawn into the picture: a camera set up so that the
// ground between his feet lands on the rock where the painted astronaut sat,
// at the painting's scale, lit like it (a warm key from the front left, a
// strong blue backlight from the planet's horizon) and reflecting a space
// sky with the chart's candles in his visor

// Where in the picture the 3D canvas sits, and where his feet go
export const ASTRONAUT_BOX: Box = { left: 1640, top: 40, width: 952, height: 1280 };
const FEET = { x: 2078, y: 1080 };
// Pixels of the picture per metre where he stands, and the camera's view
const SCALE = 415;
const FOV = 16;
const ELEVATION = THREE.MathUtils.degToRad(12);
// He faces away from us and to the left, towards the chart
const YAW = -1.95;

// A space sky for reflections: stars above, the chart's candles (green and
// navy) all the way round just above a bright blue horizon, the planet below
function environment(renderer: THREE.WebGLRenderer) {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#03081a");
  sky.addColorStop(0.36, "#0a1a45");
  sky.addColorStop(0.47, "#2d63e0");
  sky.addColorStop(0.5, "#b9d6ff");
  sky.addColorStop(0.53, "#3d74e6");
  sky.addColorStop(0.7, "#14306e");
  sky.addColorStop(1, "#070f26");
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 520; i++) {
    c.fillStyle = `rgba(220,232,255,${0.3 + random() * 0.7})`;
    c.fillRect(random() * W, random() * H * 0.38, 2, 2);
  }
  // The chart's candles, all the way round the sky (the visor shows them
  // whichever way it faces): rising, green up and navy down, in three rows
  // from just above the horizon to well up the sky
  for (const [base, scale] of [
    [470, 1],
    [380, 0.9],
    [290, 0.8],
  ]) {
    let price = 0;
    for (let x = 6; x < W; x += 26) {
      const step = (random() - 0.38) * 22 * scale;
      const open = base - price;
      price += step;
      const close = base - price;
      if (price > 90) price -= 110;
      const up = close < open;
      c.fillStyle = up ? "#62ffb2" : "#2f55dc";
      c.fillRect(x + 8, Math.min(open, close) - 14, 3, Math.abs(close - open) + 28);
      c.fillRect(x, Math.min(open, close), 18, Math.max(8, Math.abs(close - open)));
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const map = pmrem.fromEquirectangular(texture).texture;
  texture.dispose();
  pmrem.dispose();
  return map;
}

export function createAstronaut(canvas: HTMLCanvasElement, { capture = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: capture,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const env = environment(renderer);
  scene.environment = env;

  // The real model if there is one, else the one built from shapes
  let figure: Figure | null = null;
  let disposed = false;
  const built = (): Figure => {
    const rig = buildAstronaut();
    return { root: rig.root, update: (t) => pose(rig, t), dispose: rig.dispose };
  };
  const ready = loadRigged(env)
    .catch((error) => {
      console.info("[cosmic] no astronaut.glb, using the built astronaut:", error?.message ?? error);
      return built();
    })
    .then((f) => {
      if (disposed) return f.dispose();
      f.root.rotation.y = YAW;
      scene.add(f.root);
      figure = f;
    });

  scene.add(new THREE.HemisphereLight("#8fa8e0", "#0a0e18", 0.18));
  // From the left, the chart's side, as in the painting: the side facing us
  // is lit across, so the suit has shape
  const key = new THREE.DirectionalLight("#ffdcb8", 4.2);
  key.position.set(-2.6, 2.4, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -1.4;
  key.shadow.camera.right = key.shadow.camera.top = 1.4;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 10;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  // The planet's glow behind him, from low on the horizon
  const rim = new THREE.DirectionalLight("#a9ccff", 6.5);
  rim.position.set(0.9, 2.2, -3.2);
  scene.add(rim);
  const rimLeft = new THREE.DirectionalLight("#86b6ff", 2.2);
  rimLeft.position.set(-2.6, 0.5, -2.2);
  scene.add(rimLeft);
  // A soft cool fill from our side, so the shadows stay blue, not black
  const fill = new THREE.DirectionalLight("#7f9de0", 0.35);
  fill.position.set(1.2, 0.8, 3.5);
  scene.add(fill);

  // The rock takes his shadow, but only round his feet: the ledge is narrow,
  // and past it there is only sky, where a shadow would show as a dark band.
  // It fades out towards the edge of a small disc
  const shadowMaterial = new THREE.ShadowMaterial({ color: "#000814", opacity: 0.55 });
  const REACH = 0.42;
  shadowMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vDisc;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nvDisc = position.xy / ${REACH.toFixed(2)};`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vDisc;")
      .replace(/}\s*$/, "\tgl_FragColor.a *= 1.0 - smoothstep(0.45, 1.0, length(vDisc));\n}");
  };
  const catcher = new THREE.Mesh(new THREE.CircleGeometry(REACH, 48), shadowMaterial);
  catcher.rotation.x = -Math.PI / 2;
  catcher.receiveShadow = true;
  scene.add(catcher);

  // A camera that sees the whole picture, centred on his feet, then cropped
  // to the box the canvas covers
  const camera = new THREE.PerspectiveCamera(FOV, IMAGE.width / IMAGE.height, 0.1, 100);
  const distance = IMAGE.height / 2 / (SCALE * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  camera.position.set(0, distance * Math.sin(ELEVATION), distance * Math.cos(ELEVATION));
  camera.lookAt(0, 0, 0);
  camera.setViewOffset(
    IMAGE.width,
    IMAGE.height,
    ASTRONAUT_BOX.left - (FEET.x - IMAGE.width / 2),
    ASTRONAUT_BOX.top - (FEET.y - IMAGE.height / 2),
    ASTRONAUT_BOX.width,
    ASTRONAUT_BOX.height,
  );
  camera.updateProjectionMatrix();

  // The same camera seeing the whole picture, to find where a point of it
  // lies in the scene. The chart is painted as if it hung in the sky just
  // beyond him, not far off in space: a point of it is where its ray crosses
  // an upright plane a little behind him (were it far off, he would look
  // away from us into the distance, his visor out of sight)
  const whole = camera.clone();
  whole.clearViewOffset();
  whole.updateProjectionMatrix();
  const CHART_DEPTH = 1.0;
  const gazePoint = new THREE.Vector3();
  const ray = new THREE.Vector3();
  const toScene = (x: number, y: number, depth = CHART_DEPTH) => {
    ray
      .set((x / IMAGE.width) * 2 - 1, 1 - (y / IMAGE.height) * 2, 0.5)
      .unproject(whole)
      .sub(whole.position)
      .normalize();
    const along = (-depth - whole.position.z) / ray.z;
    return gazePoint.copy(whole.position).addScaledVector(ray, along);
  };

  return {
    ready,
    resize(width: number, height: number, pixelRatio: number) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
    },
    // `gaze`: the point of the picture he looks at, in its pixels, and how
    // far behind him it lies in the scene (the chart's plane if not given)
    render(t: number, gaze?: { x: number; y: number; depth?: number } | null) {
      if (!figure) return;
      figure.update(t, gaze ? toScene(gaze.x, gaze.y, gaze.depth) : null);
      renderer.render(scene, camera);
    },
    dispose() {
      disposed = true;
      figure?.dispose();
      env.dispose();
      catcher.geometry.dispose();
      (catcher.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
