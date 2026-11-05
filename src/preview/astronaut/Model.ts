import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// The astronaut, built from simple turned and rounded shapes after the one in
// the picture: an off-white suit with dark rings at every joint, a white helmet
// with a mirrored visor and a blue light at its side, and a pack on the back
// with a dark panel, the ringed-planet logo and blue light strips down its
// edges. Metres; the figure faces +Z with its left hand at +X

export const SIZE = {
  thigh: 0.44,
  shin: 0.43,
  ankle: 0.1,
  upperArm: 0.29,
  forearm: 0.27,
  hipJoint: { x: 0.105, y: -0.03 },
  shoulder: { x: 0.235, y: 0.25 },
  neck: 0.31,
};

export type Limb = { group: THREE.Group; length: number };

export type Rig = {
  root: THREE.Group;
  pelvis: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  head: THREE.Group;
  shoulders: { left: THREE.Object3D; right: THREE.Object3D };
  thigh: { left: Limb; right: Limb };
  shin: { left: Limb; right: Limb };
  upperArm: { left: Limb; right: Limb };
  forearm: { left: Limb; right: Limb };
  hand: { left: THREE.Group; right: THREE.Group };
  foot: { left: THREE.Group; right: THREE.Group };
  shadow: THREE.Mesh;
  dispose: () => void;
};

function canvasTexture(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Soft creases running round the sleeves (lathe UVs run round in u, along in
// v), uneven in spacing and depth, as a normal map
function foldsTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d")!;
  const image = c.createImageData(size, size);
  let seed = 5;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const folds = Array.from({ length: 9 }, () => ({
    at: random(),
    depth: 0.4 + random() * 0.6,
    tilt: (random() - 0.5) * 0.25,
  }));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let slope = 0;
      for (const f of folds) {
        const d = v - f.at - f.tilt * Math.sin(u * Math.PI * 2);
        const w = 0.035;
        slope += (-2 * d * f.depth * Math.exp(-(d * d) / (w * w))) / w;
      }
      const i = (y * size + x) * 4;
      image.data[i] = 128;
      image.data[i + 1] = Math.max(0, Math.min(255, 128 + slope * 60));
      image.data[i + 2] = 255;
      image.data[i + 3] = 255;
    }
  c.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// The pack's logo: a planet with a tilted ring, green fading to yellow
function logoTexture() {
  return canvasTexture(256, (c, s) => {
    c.fillStyle = "#0b1019";
    c.fillRect(0, 0, s, s);
    const glow = c.createRadialGradient(s * 0.5, s * 0.5, 0, s * 0.5, s * 0.5, s * 0.5);
    glow.addColorStop(0, "rgba(60,120,255,0.18)");
    glow.addColorStop(1, "rgba(60,120,255,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, s, s);
    c.translate(s / 2, s / 2);
    c.rotate(-0.42);
    const ring = c.createLinearGradient(-s * 0.36, 0, s * 0.36, 0);
    ring.addColorStop(0, "#2fe07a");
    ring.addColorStop(1, "#e9f75a");
    // The back of the ring, then the planet, then the front of the ring
    c.lineWidth = s * 0.035;
    c.strokeStyle = ring;
    c.beginPath();
    c.ellipse(0, 0, s * 0.34, s * 0.11, 0, Math.PI, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#dfe6f2";
    c.beginPath();
    c.arc(0, 0, s * 0.17, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#9fb1cc";
    c.beginPath();
    c.arc(s * 0.05, s * 0.05, s * 0.13, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = ring;
    c.beginPath();
    c.ellipse(0, 0, s * 0.34, s * 0.11, 0, 0, Math.PI);
    c.stroke();
  });
}

// The round patch on the left shoulder: a green swoosh on navy
function patchTexture() {
  return canvasTexture(128, (c, s) => {
    c.fillStyle = "#101a2c";
    c.beginPath();
    c.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = s * 0.05;
    c.strokeStyle = "#cfd6e2";
    c.beginPath();
    c.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2);
    c.stroke();
    c.lineCap = "round";
    c.lineWidth = s * 0.1;
    c.strokeStyle = "#42e38a";
    c.beginPath();
    c.moveTo(s * 0.24, s * 0.66);
    c.quadraticCurveTo(s * 0.5, s * 0.44, s * 0.78, s * 0.32);
    c.stroke();
    c.fillStyle = "#42e38a";
    c.beginPath();
    c.arc(s * 0.62, s * 0.62, s * 0.07, 0, Math.PI * 2);
    c.fill();
  });
}

function glowTexture() {
  return canvasTexture(64, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });
}

function shadowTexture() {
  return canvasTexture(128, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(0,0,0,0.85)");
    g.addColorStop(0.45, "rgba(0,0,0,0.45)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });
}

// A shape turned about Y from 0 to `length`: rounded at both ends, its radius
// running from r0 to r1 with a little swell in the middle, like a padded sleeve
function sleeve(length: number, r0: number, r1: number, swell = 0.012) {
  const points: THREE.Vector2[] = [];
  const cap0 = r0 * 0.9;
  const cap1 = r1 * 0.9;
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    points.push(new THREE.Vector2(Math.sin(a) * r0, cap0 - Math.cos(a) * cap0));
  }
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const y = cap0 + (length - cap0 - cap1) * t;
    points.push(new THREE.Vector2(r0 + (r1 - r0) * t + swell * Math.sin(Math.PI * t), y));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    points.push(new THREE.Vector2(Math.cos(a) * r1, length - cap1 + Math.sin(a) * cap1));
  }
  return new THREE.LatheGeometry(points, 28);
}

function ring(radius: number, tube: number) {
  const geometry = new THREE.TorusGeometry(radius, tube, 10, 32);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export function buildAstronaut(): Rig {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(thing: T) => {
    disposables.push(thing);
    return thing;
  };

  const folds = keep(foldsTexture());
  const fabric = keep(
    new THREE.MeshPhysicalMaterial({
      normalMap: folds,
      normalScale: new THREE.Vector2(0.55, 0.55),
      color: "#c9bfad",
      roughness: 0.84,
      sheen: 0.5,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color("#7fa6f0"),
      envMapIntensity: 0.3,
    }),
  );
  const shell = keep(
    new THREE.MeshPhysicalMaterial({
      color: "#d4cec4",
      roughness: 0.45,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.4,
    }),
  );
  const dark = keep(
    new THREE.MeshStandardMaterial({ color: "#23262d", roughness: 0.42, metalness: 0.45, envMapIntensity: 0.9 }),
  );
  const rubber = keep(new THREE.MeshStandardMaterial({ color: "#16181d", roughness: 0.85 }));
  const steel = keep(
    new THREE.MeshStandardMaterial({ color: "#9aa3b0", roughness: 0.3, metalness: 0.85, envMapIntensity: 1.1 }),
  );
  const visor = keep(
    new THREE.MeshPhysicalMaterial({
      color: "#5d7dbd",
      metalness: 1,
      roughness: 0.03,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.6,
    }),
  );
  const light = keep(new THREE.MeshBasicMaterial({ color: "#6cc8ff", toneMapped: false }));
  const logo = keep(logoTexture());
  const panel = keep(
    new THREE.MeshStandardMaterial({
      map: logo,
      emissiveMap: logo,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 0.85,
      roughness: 0.35,
      metalness: 0.2,
    }),
  );
  const patchMap = keep(patchTexture());
  const patch = keep(new THREE.MeshStandardMaterial({ map: patchMap, roughness: 0.5 }));
  const glowMap = keep(glowTexture());
  const glow = keep(
    new THREE.SpriteMaterial({
      map: glowMap,
      color: "#5ab8ff",
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.85,
    }),
  );

  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const m = new THREE.Mesh(keep(geometry), material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const sprite = (size: number) => {
    const s = new THREE.Sprite(glow);
    s.scale.setScalar(size);
    return s;
  };

  const root = new THREE.Group();

  // Pelvis, the waist, the belly and chest as two parts so the back can curl
  const pelvis = new THREE.Group();
  const hips = mesh(new THREE.SphereGeometry(0.152, 32, 20), fabric);
  hips.scale.set(1.12, 0.72, 0.86);
  pelvis.add(hips);
  const belt = mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.05, 32), dark);
  belt.scale.set(1.14, 1, 0.9);
  belt.position.y = 0.075;
  pelvis.add(belt);

  const spine = new THREE.Group();
  spine.position.y = 0.08;
  pelvis.add(spine);
  const belly = mesh(sleeve(0.24, 0.15, 0.175, 0.006), fabric);
  belly.scale.set(1.15, 1, 0.86);
  spine.add(belly);

  const chest = new THREE.Group();
  chest.position.y = 0.17;
  spine.add(chest);
  const torso = mesh(sleeve(0.32, 0.18, 0.15, 0.03), fabric);
  torso.scale.set(1.22, 1, 0.88);
  chest.add(torso);
  // Chest unit: a white plate with a dark display
  const plate = mesh(new RoundedBoxGeometry(0.24, 0.15, 0.06, 3, 0.02), shell);
  plate.position.set(0, 0.17, 0.15);
  chest.add(plate);
  const display = mesh(new RoundedBoxGeometry(0.15, 0.07, 0.02, 2, 0.008), dark);
  display.position.set(0, 0.175, 0.182);
  chest.add(display);
  for (const x of [-0.05, 0, 0.05]) {
    const dot = new THREE.Mesh(keep(new THREE.SphereGeometry(0.008, 8, 6)), light);
    dot.position.set(x, 0.175, 0.193);
    chest.add(dot);
  }
  // Collar and neck ring
  const collar = mesh(sleeve(0.06, 0.13, 0.12, 0), shell);
  collar.position.y = 0.28;
  collar.scale.set(1.1, 1, 1);
  chest.add(collar);
  const neckRing = mesh(new THREE.CylinderGeometry(0.128, 0.13, 0.045, 32), dark);
  neckRing.position.y = SIZE.neck;
  chest.add(neckRing);

  const shoulders = { left: new THREE.Object3D(), right: new THREE.Object3D() };
  for (const [side, s] of [
    ["left", 1],
    ["right", -1],
  ] as const) {
    shoulders[side].position.set(SIZE.shoulder.x * s, SIZE.shoulder.y, -0.01);
    chest.add(shoulders[side]);
    // A padded shoulder with a dark ring where the arm meets it
    const pad = mesh(new THREE.SphereGeometry(0.098, 24, 16), fabric);
    pad.position.set(SIZE.shoulder.x * s * 0.93, SIZE.shoulder.y + 0.01, -0.01);
    chest.add(pad);
  }

  // The pack: white frame, dark panel with the logo, blue strips down both
  // edges and along the bottom
  const pack = new THREE.Group();
  pack.position.set(0, 0.07, -0.235);
  chest.add(pack);
  pack.scale.setScalar(0.86);
  pack.add(mesh(new RoundedBoxGeometry(0.46, 0.62, 0.2, 4, 0.045), shell));
  const inset = mesh(new RoundedBoxGeometry(0.31, 0.44, 0.03, 3, 0.014), panel);
  inset.position.set(0.0, 0.0, -0.096);
  inset.rotation.y = Math.PI;
  pack.add(inset);
  const cap = mesh(new RoundedBoxGeometry(0.4, 0.07, 0.17, 3, 0.025), shell);
  cap.position.set(0, 0.33, 0.005);
  pack.add(cap);
  const capBand = mesh(new RoundedBoxGeometry(0.3, 0.025, 0.02, 2, 0.008), dark);
  capBand.position.set(0, 0.33, -0.08);
  pack.add(capBand);
  for (const s of [1, -1]) {
    const rail = mesh(new RoundedBoxGeometry(0.035, 0.56, 0.06, 2, 0.012), dark);
    rail.position.set(0.215 * s, -0.01, -0.06);
    pack.add(rail);
    for (const y of [0.12, -0.17]) {
      const strip = new THREE.Mesh(keep(new RoundedBoxGeometry(0.014, 0.12, 0.012, 2, 0.005)), light);
      strip.position.set(0.215 * s, y, -0.093);
      pack.add(strip);
      const halo = sprite(0.13);
      halo.position.set(0.215 * s, y, -0.11);
      pack.add(halo);
    }
    const foot = mesh(new RoundedBoxGeometry(0.1, 0.05, 0.16, 2, 0.015), shell);
    foot.position.set(0.14 * s, -0.33, 0);
    pack.add(foot);
  }
  const bottom = new THREE.Mesh(keep(new RoundedBoxGeometry(0.16, 0.012, 0.012, 2, 0.005)), light);
  bottom.position.set(0, -0.255, -0.095);
  pack.add(bottom);
  const bottomHalo = sprite(0.12);
  bottomHalo.position.set(0, -0.255, -0.11);
  pack.add(bottomHalo);
  // A small blue light on the pack's top
  const beacon = new THREE.Mesh(keep(new RoundedBoxGeometry(0.05, 0.014, 0.014, 2, 0.005)), light);
  beacon.position.set(0.12, 0.33, -0.088);
  pack.add(beacon);
  const packLight = new THREE.PointLight("#4aa8ff", 0.35, 0.8, 2);
  packLight.position.set(0, -0.05, -0.2);
  pack.add(packLight);

  // The helmet: a white shell, the visor, a brow ridge, vents on top and the
  // ringed light at the side
  const head = new THREE.Group();
  head.position.set(0, SIZE.neck, 0.01);
  chest.add(head);
  const helmet = new THREE.Group();
  helmet.position.y = 0.17;
  head.add(helmet);
  const dome = mesh(new THREE.SphereGeometry(0.2, 48, 32), shell);
  dome.scale.set(1, 1.02, 1.04);
  helmet.add(dome);
  const glass = mesh(new THREE.SphereGeometry(0.2045, 48, 24, Math.PI / 2 - 1.2, 2.4, 0.92, 1.24), visor);
  glass.scale.set(1, 1.02, 1.04);
  glass.castShadow = false;
  helmet.add(glass);
  // The frame round the visor
  const frameCurve = new THREE.EllipseCurve(0, 0, 0.186, 0.132, 0, Math.PI * 2, false, 0);
  const framePoints = frameCurve.getPoints(64).map((p) => {
    // Lay the ellipse onto the dome's front
    const v = new THREE.Vector3(p.x, p.y + 0.0, 0);
    const z = Math.sqrt(Math.max(0, 0.209 * 0.209 - v.x * v.x - v.y * v.y));
    return new THREE.Vector3(v.x, v.y - 0.02, z * 1.04);
  });
  const frame = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(framePoints, true), 96, 0.011, 8, true), dark);
  helmet.add(frame);
  const brow = mesh(new RoundedBoxGeometry(0.16, 0.035, 0.05, 2, 0.015), shell);
  brow.position.set(0, 0.16, 0.1);
  brow.rotation.x = -0.6;
  helmet.add(brow);
  for (const [x, z, r] of [
    [0.06, -0.03, 0.15],
    [-0.06, -0.03, -0.15],
  ] as const) {
    const vent = mesh(new RoundedBoxGeometry(0.04, 0.02, 0.11, 2, 0.008), dark);
    vent.position.set(x, 0.195, z);
    vent.rotation.set(0.1, r, 0);
    helmet.add(vent);
  }
  for (const s of [1, -1]) {
    const ear = new THREE.Group();
    ear.position.set(0.2 * s, -0.005, 0.02);
    ear.rotation.z = (-Math.PI / 2) * s;
    helmet.add(ear);
    ear.add(mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.035, 32), dark));
    const halo = new THREE.Mesh(keep(new THREE.TorusGeometry(0.03, 0.007, 8, 32)), light);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.019;
    ear.add(halo);
    const lens = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 24), steel);
    lens.position.y = 0.02;
    ear.add(lens);
    const earGlow = sprite(0.11);
    earGlow.position.y = 0.04;
    ear.add(earGlow);
  }
  // A short light strip under the visor on the left cheek
  const cheek = new THREE.Mesh(keep(new RoundedBoxGeometry(0.035, 0.012, 0.012, 2, 0.005)), light);
  cheek.position.set(0.135, -0.12, 0.12);
  cheek.rotation.z = 0.5;
  helmet.add(cheek);

  // Limbs: a padded sleeve along +Y with dark rings at its ends
  const limb = (length: number, r0: number, r1: number, rings: [number, number][]): Limb => {
    const group = new THREE.Group();
    group.add(mesh(sleeve(length, r0, r1), fabric));
    for (const [at, r] of rings) {
      // A wide dark band, pleated like a bellows
      const band = mesh(new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.055, 28, 1), dark);
      band.position.y = at * length;
      group.add(band);
      for (const dy of [-0.018, 0, 0.018]) {
        const pleat = mesh(ring(r + 0.006, 0.0055), dark);
        pleat.position.y = at * length + dy;
        group.add(pleat);
      }
    }
    root.add(group);
    return { group, length };
  };
  const thigh = {
    left: limb(SIZE.thigh, 0.112, 0.094, [[0.14, 0.108]]),
    right: limb(SIZE.thigh, 0.112, 0.094, [[0.14, 0.108]]),
  };
  const shin = {
    left: limb(SIZE.shin, 0.095, 0.08, [
      [0.1, 0.096],
      [0.84, 0.081],
    ]),
    right: limb(SIZE.shin, 0.095, 0.08, [
      [0.1, 0.096],
      [0.84, 0.081],
    ]),
  };
  // Knee pads
  for (const s of [shin.left, shin.right]) {
    const pad = mesh(new THREE.SphereGeometry(0.075, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), shell);
    pad.rotation.x = Math.PI / 2;
    pad.position.set(0, 0.015, 0.03);
    pad.scale.set(0.9, 0.55, 1);
    s.group.add(pad);
  }
  const upperArm = {
    left: limb(SIZE.upperArm, 0.078, 0.068, [
      [0.1, 0.079],
      [0.92, 0.069],
    ]),
    right: limb(SIZE.upperArm, 0.078, 0.068, [
      [0.1, 0.079],
      [0.92, 0.069],
    ]),
  };
  const patchMesh = mesh(new THREE.CircleGeometry(0.045, 32), patch);
  // On the outside of the arm (the limb's front faces outwards, see Pose)
  patchMesh.position.set(0, 0.17, 0.079);
  upperArm.left.group.add(patchMesh);
  const forearm = {
    left: limb(SIZE.forearm, 0.068, 0.056, [[0.88, 0.06]]),
    right: limb(SIZE.forearm, 0.068, 0.056, [[0.88, 0.06]]),
  };
  // A blue light on each wrist ring
  for (const f of [forearm.left, forearm.right]) {
    const led = new THREE.Mesh(keep(new RoundedBoxGeometry(0.02, 0.01, 0.01, 2, 0.004)), light);
    led.position.set(0, 0.88 * SIZE.forearm, 0.066);
    f.group.add(led);
  }

  const glove = () => {
    const group = new THREE.Group();
    const palm = mesh(new RoundedBoxGeometry(0.085, 0.1, 0.05, 3, 0.022), dark);
    palm.position.y = 0.05;
    group.add(palm);
    const back = mesh(new RoundedBoxGeometry(0.075, 0.07, 0.02, 3, 0.009), shell);
    back.position.set(0, 0.045, 0.024);
    group.add(back);
    const thumb = mesh(new THREE.CapsuleGeometry(0.016, 0.04, 4, 10), dark);
    thumb.position.set(0.045, 0.04, 0.0);
    thumb.rotation.z = -0.5;
    group.add(thumb);
    root.add(group);
    return group;
  };
  const hand = { left: glove(), right: glove() };

  const boot = (s: number) => {
    const group = new THREE.Group();
    const upper = mesh(new RoundedBoxGeometry(0.145, 0.14, 0.27, 4, 0.05), shell);
    upper.position.set(0, -0.035, 0.045);
    group.add(upper);
    const shaft = mesh(sleeve(0.1, 0.08, 0.078, 0), shell);
    shaft.position.y = -0.04;
    group.add(shaft);
    const sole = mesh(new RoundedBoxGeometry(0.155, 0.035, 0.29, 3, 0.012), rubber);
    sole.position.set(0, -0.09, 0.045);
    group.add(sole);
    const strap = mesh(new RoundedBoxGeometry(0.15, 0.025, 0.12, 2, 0.01), dark);
    strap.position.set(0, 0.0, 0.1);
    strap.rotation.x = 0.35;
    group.add(strap);
    group.rotation.y = 0.12 * s;
    root.add(group);
    return group;
  };
  const foot = { left: boot(1), right: boot(-1) };

  root.add(pelvis);

  // A soft dark patch on the ground under the figure
  const shadowMap = keep(shadowTexture());
  const shadow = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(1, 1)),
    keep(new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: 0.9 })),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  shadow.renderOrder = -1;
  root.add(shadow);

  return {
    root,
    pelvis,
    spine,
    chest,
    head,
    shoulders,
    thigh,
    shin,
    upperArm,
    forearm,
    hand,
    foot,
    shadow,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
