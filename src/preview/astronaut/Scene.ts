import * as THREE from "three";
import { type Box, IMAGE } from "../Layout";
import { buildAstronaut } from "./Model";
import { pose } from "./Pose";

// The 3D astronaut drawn into the picture: a camera set up so that the
// ground between his feet lands on the rock where the painted astronaut sat,
// at the painting's scale, lit like it (a warm key from the front left, a
// strong blue backlight from the planet's horizon) and reflecting a space
// sky with the chart's candles in his visor

// Where in the picture the 3D canvas sits, and where his feet go
export const ASTRONAUT_BOX: Box = { left: 1760, top: 230, width: 832, height: 1040 };
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
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const c = canvas.getContext("2d")!;
  const sky = c.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, "#03081a");
  sky.addColorStop(0.36, "#0a1a45");
  sky.addColorStop(0.47, "#2d63e0");
  sky.addColorStop(0.5, "#b9d6ff");
  sky.addColorStop(0.53, "#3d74e6");
  sky.addColorStop(0.7, "#14306e");
  sky.addColorStop(1, "#070f26");
  c.fillStyle = sky;
  c.fillRect(0, 0, 1024, 512);
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) {
    c.fillStyle = `rgba(220,232,255,${0.3 + random() * 0.7})`;
    c.fillRect(random() * 1024, random() * 190, 1.3, 1.3);
  }
  // Candles rising across, repeated round the whole sky
  // Two rows of them, so the visor catches some whichever way it faces
  for (const [base, height] of [
    [235, 1],
    [150, 0.8],
  ]) {
    let price = 0;
    for (let x = 4; x < 1024; x += 11) {
      const step = (random() - 0.36) * 10 * height;
      const open = base - price;
      price += step;
      const close = base - price;
      if (price > 70) price -= 80;
      const up = close < open;
      c.fillStyle = up ? "#5cffae" : "#3a64d8";
      c.fillRect(x + 3, Math.min(open, close) - 7, 1.6, Math.abs(close - open) + 14);
      c.fillRect(x, Math.min(open, close), 7, Math.max(4, Math.abs(close - open)));
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
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const env = environment(renderer);
  scene.environment = env;

  const rig = buildAstronaut();
  rig.root.rotation.y = YAW;
  scene.add(rig.root);

  scene.add(new THREE.HemisphereLight("#7fa5ff", "#0a0e18", 0.22));
  // From the left, the chart's side, as in the painting: the side facing us
  // is lit across, so the suit has shape
  const key = new THREE.DirectionalLight("#ffeedd", 3.1);
  key.position.set(-3.8, 2.6, 0.6);
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
  const rim = new THREE.DirectionalLight("#4f8fff", 5.2);
  rim.position.set(1.6, 0.7, -3.4);
  scene.add(rim);
  const rimLeft = new THREE.DirectionalLight("#86b6ff", 2.2);
  rimLeft.position.set(-2.6, 0.5, -2.2);
  scene.add(rimLeft);
  // A soft cool fill from our side, so the shadows stay blue, not black
  const fill = new THREE.DirectionalLight("#7f9de0", 0.7);
  fill.position.set(1.2, 0.8, 3.5);
  scene.add(fill);

  // The rock takes his shadow
  const catcher = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 5),
    new THREE.ShadowMaterial({ color: "#000814", opacity: 0.5 }),
  );
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

  return {
    resize(width: number, height: number, pixelRatio: number) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
    },
    render(t: number) {
      pose(rig, t);
      renderer.render(scene, camera);
    },
    dispose() {
      rig.dispose();
      env.dispose();
      catcher.geometry.dispose();
      (catcher.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
