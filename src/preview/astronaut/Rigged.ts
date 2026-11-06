import * as THREE from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// The astronaut as a real model: a rigged, textured character (made from the
// painting, see README.md here) with two motion-captured clips, sitting on the
// ground with his knees up, and getting up off the ground. He sits, eases into
// the second where its pose is closest to the first (knees drawn in), and
// stands. The clips are not played in real time but set to the intro's
// clock, so the page and a recording see the same frames. Over them his
// eyes are on the chart: the neck and head turn, each frame, towards the
// point where it is being drawn, so he gets up watching it; and his feet stay
// where they are on the rock throughout.

export const MODEL = {
  url: "/cosmic/astronaut.glb",
  // The clips, by name
  sit: "Sit",
  stand: "Stand",
  // When in the intro he goes from the one clip to the other, and when the
  // getting up plays (slowed a little: a suit is heavy), in seconds
  blend: [3.4, 4.3] as [number, number],
  rise: [3.6, 8.9] as [number, number],
  // The part of the getting up used, in the clip's seconds: from the frame
  // closest to the sitting pose to where he is up and still
  from: 1.1,
  to: 5.5,
  // His height standing, in the scene's metres (415px of the picture each):
  // what makes him, sitting, the size of the astronaut in the painting
  height: 2.27,
  // Bone scales that give him the painting's build: the model came out with
  // a person's proportions, the astronaut in the picture is stockier (a
  // larger helmet and pack, a broad chest, short thick legs). By the end of
  // each bone's name; x and z across the bone, y along it
  proportions: {
    Spine: [1.26, 1.26, 1.26],
    Head: [1.12, 1.12, 1.12],
    UpLeg: [1.14, 0.98, 1.14],
  } as Record<string, [number, number, number]>,
  // The material of the visor (the model comes in parts, the visor one of
  // them), which becomes a mirror showing the sky and the chart's candles
  visor: /part_17_|visor|glass/i,
};

// The model's textures are colour only, so the rest is found from the
// colour: the suit's lights (a bright cyan blue) and the planet logo (a
// yellow green) glow, and all of it is a matte suit
function paintMaps(material: THREE.MeshStandardMaterial) {
  const source = material.map?.image as CanvasImageSource & { width: number; height: number };
  if (!source) return [];
  const size = Math.min(2048, source.width);
  const canvas = (w = size) => {
    const c = document.createElement("canvas");
    c.width = c.height = w;
    return c;
  };
  const base = canvas();
  const b = base.getContext("2d", { willReadFrequently: true })!;
  b.drawImage(source, 0, 0, size, size);
  const pixels = b.getImageData(0, 0, size, size);
  const lit = { any: false };
  const glow = new ImageData(size, size);
  const surface = new ImageData(size, size);
  const d = pixels.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, bl] = [d[i], d[i + 1], d[i + 2]];
    const light = bl > 170 && bl - r > 45 && g > 110;
    const logo = r > 140 && g > 170 && bl < 110;
    if (light || logo) {
      lit.any = true;
      glow.data[i] = r;
      glow.data[i + 1] = g;
      glow.data[i + 2] = bl;
    }
    glow.data[i + 3] = 255;
    // Roughness in green, metalness in blue
    surface.data[i + 1] = 165;
    surface.data[i + 2] = 10;
    surface.data[i + 3] = 255;
  }
  const soft = (data: ImageData, blur: number) => {
    const raw = canvas();
    raw.getContext("2d")!.putImageData(data, 0, 0);
    const out = canvas();
    const o = out.getContext("2d")!;
    o.filter = `blur(${blur}px)`;
    o.drawImage(raw, 0, 0);
    return out;
  };
  const texture = (c: HTMLCanvasElement, colour: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.flipY = false;
    t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const roughness = texture(soft(surface, size / 2048), false);
  material.roughnessMap = roughness;
  material.metalnessMap = roughness;
  material.roughness = 1;
  material.metalness = 1;
  const made = [roughness];
  if (lit.any) {
    const emissiveMap = texture(soft(glow, size / 1024), true);
    material.emissiveMap = emissiveMap;
    material.emissive = new THREE.Color("#9fc2ff");
    material.emissiveIntensity = 1.6;
    made.push(emissiveMap);
  }
  material.needsUpdate = true;
  return made;
}

// `gaze`: the point in the scene he looks at, if any
export type Figure = {
  root: THREE.Object3D;
  update: (t: number, gaze?: THREE.Vector3 | null) => void;
  dispose: () => void;
};

const smoother = (t: number, [a, b]: [number, number]) => {
  const s = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return s * s * s * (s * (s * 6 - 15) + 10);
};

// How the eyes follow: from when he first turns to the chart, how far the
// neck and head may turn from where the clip has them (about as far as a
// person can look round without turning the body), and the neck's share
const GAZE = {
  // When his eyes first lift (looking up only: the clip already has his head
  // turned to his left), and when he starts turning his head as well
  lift: [0.2, 1.8] as [number, number],
  turn: [1.4, 2.9] as [number, number],
  // Round to either side, and up and down: about its own neck and ears,
  // never rolling
  yaw: THREE.MathUtils.degToRad(75),
  up: THREE.MathUtils.degToRad(16),
  // How much of looking up or down the head does: the eyes do the rest
  pitchGain: 0.5,
  down: THREE.MathUtils.degToRad(12),
  // The body carries the look, each part a share of what is left of the
  // turn and each a little slower than the one above it: the head leads,
  // the neck follows, the chest and upper back come round after (only once
  // he is upright; bent over, the clip has the body)
  chain: [
    { bone: /Spine1$/, share: 0.12, ease: 0.95, pitch: 0 },
    { bone: /Spine2$/, share: 0.16, ease: 0.8, pitch: 0 },
    { bone: /Neck$/, share: 0.38, ease: 0.6, pitch: 0.4 },
    { bone: /Head$/, share: 1, ease: 0.42, pitch: 1 },
  ],
  // While he is crouched, pushing up off the ground, his eyes are on his
  // footing, as anyone's are: the look gives way to the clip's own head
  // (keeping this much of it), then comes back as he straightens
  crouch: { down: [3.2, 4.6] as [number, number], up: [6.4, 8.6] as [number, number], keep: 0.2 },
  // As he straightens he turns a little on his feet towards the chart, as
  // anyone does towards what they are watching, so his head need not turn
  // so far round: how far (radians) and when
  pivot: { angle: 0.3, during: [5.6, 8.8] as [number, number] },
  // How long what the look adds to the head takes to settle, in seconds
  settle: 0.3,
  // Top speed of any one part's turn
  speed: THREE.MathUtils.degToRad(55),
  // On the last look, out into space: the head dips a little on its way
  // round and comes up at the end (an arc, not a swivel), and leans a touch
  // into the turn
  arcDip: THREE.MathUtils.degToRad(3),
  lean: THREE.MathUtils.degToRad(5),
};

// Pushing up off the ground, he leans on his right hand. In the clip it
// presses on a floor that, where it falls in the picture, is open sky in
// front of the planet. The arm reaches instead (two-bone IK) for the ridge of
// painted rock that rises just to his right, and the hand stays put there
// while he pushes, lifting off as his arm straightens. In the scene's metres
// (he stands at the origin, we look from +z); `blend` is when the hand goes
// to it and when it lifts off again
const HAND_REST = {
  // Where the fingertips rest on the rock
  tips: new THREE.Vector3(0.77, 0.04, -0.46),
  // Which way the fingers lie along it, and which way the palm faces (onto
  // the stone, a little in towards him as a pushing hand does)
  fingers: new THREE.Vector3(1, -0.18, 0.15),
  palm: new THREE.Vector3(-0.25, -1, 0),
  // The hand's own palm side, as an axis of the hand bone
  palmLocal: new THREE.Vector3(0, 0, 1),
  // When the hand goes down onto the rock; when the heel of the hand lifts
  // off, the fingertips staying put as it rolls up onto them; and when the
  // fingers leave the stone and the arm goes with the body
  down: [3.55, 4.05] as [number, number],
  peel: [4.58, 4.95] as [number, number],
  off: [4.75, 5.35] as [number, number],
  // How far the hand rolls up onto its fingertips, in radians
  roll: THREE.MathUtils.degToRad(55),
};

// Standing there once the intro is over: never quite still. He breathes (the
// chest and shoulders rise and fall), shifts his weight from foot to foot
// (the upper body sways a touch over his planted feet), and his head drifts,
// as someone's does looking out at something. All small and slow, and each
// at its own pace, so it never visibly repeats. Radians and seconds; it comes
// in over `start`, after his last turn of the head has settled
const IDLE = {
  start: [12.2, 14.6] as [number, number],
  breath: { period: 4.6, chest: THREE.MathUtils.degToRad(0.9) },
  sway: { period: 8.3, roll: THREE.MathUtils.degToRad(0.8), turn: THREE.MathUtils.degToRad(0.7) },
  head: { turn: THREE.MathUtils.degToRad(2.2), nod: THREE.MathUtils.degToRad(1.2) },
};
const TAU = Math.PI * 2;
// A slow wander between -1 and 1 from two waves that never fall into step
const wander = (t: number, a: number, b: number, phase: number) =>
  0.62 * Math.sin((TAU * t) / a + phase) + 0.38 * Math.sin((TAU * t) / b + phase * 1.7);

// The last look of the intro, away from the chart and out into open space
// (CosmicHero aims it; here it shapes how the head travels)
export const LOOK_AWAY: [number, number] = [8.3, 10.4];

// Turns `bone` by the world rotation `q`
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
function rotateWorld(bone: THREE.Object3D, q: THREE.Quaternion) {
  if (!bone.parent) return;
  bone.getWorldQuaternion(qa);
  qa.premultiply(q);
  bone.parent.getWorldQuaternion(qb);
  bone.quaternion.copy(qb.invert().multiply(qa));
  bone.updateMatrixWorld(true);
}

function bounds(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    // Skinned meshes measure themselves as posed
    const skinned = mesh as THREE.SkinnedMesh;
    let own: THREE.Box3;
    if (skinned.isSkinnedMesh) {
      skinned.computeBoundingBox();
      own = skinned.boundingBox!.clone();
    } else {
      mesh.geometry.computeBoundingBox();
      own = mesh.geometry.boundingBox!.clone();
    }
    box.union(own.applyMatrix4(mesh.matrixWorld));
  });
  return box;
}

export async function loadRigged(environment: THREE.Texture): Promise<Figure> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(MODEL.url);
  const model = gltf.scene;
  const sitClip = gltf.animations.find((a) => a.name === MODEL.sit);
  const standClip = gltf.animations.find((a) => a.name === MODEL.stand);
  if (!sitClip || !standClip) throw new Error(`astronaut.glb needs the clips "${MODEL.sit}" and "${MODEL.stand}"`);

  // Materials: lit by the scene, the suit soft, the visor a mirror
  const visor = new THREE.MeshPhysicalMaterial({
    color: "#03060f",
    metalness: 1,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMap: environment,
    envMapIntensity: 2.2,
  });
  const owned: THREE.Material[] = [visor];
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const isVisor = (m: THREE.Material) => MODEL.visor.test(mesh.name) || MODEL.visor.test(m.name);
    const next = materials.map((m) => {
      if (isVisor(m)) return visor;
      const standard = m as THREE.MeshStandardMaterial;
      if (standard.isMeshStandardMaterial) {
        standard.envMap = environment;
        standard.envMapIntensity = 0.4;
        if (!standard.roughnessMap && !paintMaps(standard).length) {
          standard.roughness = Math.max(standard.roughness, 0.55);
          standard.metalness = Math.min(standard.metalness, 0.1);
        }
        owned.push(standard);
      }
      return m;
    });
    mesh.material = Array.isArray(mesh.material) ? next : next[0];
  });

  const shaped: [THREE.Object3D, [number, number, number]][] = [];
  model.traverse((object) => {
    if (!(object as THREE.Bone).isBone) return;
    for (const [end, scale] of Object.entries(MODEL.proportions))
      if (object.name.endsWith(end)) shaped.push([object, scale]);
  });

  const mixer = new THREE.AnimationMixer(model);
  const sit = mixer.clipAction(sitClip);
  const stand = mixer.clipAction(standClip);
  for (const action of [sit, stand]) {
    action.play();
    action.paused = true;
  }
  // The pose at `t` seconds of the intro
  const at = (t: number) => {
    const w = smoother(t, MODEL.blend);
    sit.time = Math.min(t, MODEL.blend[1]) % sitClip.duration;
    sit.setEffectiveWeight(1 - w);
    const [a, b] = MODEL.rise;
    stand.time = MODEL.from + (MODEL.to - MODEL.from) * Math.min(1, Math.max(0, (t - a) / (b - a)));
    stand.setEffectiveWeight(w);
    mixer.update(0);
    for (const [bone, [x, y, z]] of shaped) bone.scale.set(x, y, z);
  };

  let leftFoot: THREE.Object3D | undefined;
  let rightFoot: THREE.Object3D | undefined;
  model.traverse((object) => {
    if (!(object as THREE.Bone).isBone) return;
    if (!leftFoot && /leftfoot$/i.test(object.name)) leftFoot = object;
    if (!rightFoot && /rightfoot$/i.test(object.name)) rightFoot = object;
  });
  // Keeps the point between his feet over the origin, so he never slides
  const footL = new THREE.Vector3();
  const footR = new THREE.Vector3();
  const plant = () => {
    if (!leftFoot || !rightFoot) return;
    root.updateMatrixWorld(true);
    root.worldToLocal(leftFoot.getWorldPosition(footL));
    root.worldToLocal(rightFoot.getWorldPosition(footR));
    model.position.x -= (footL.x + footR.x) / 2;
    model.position.z -= (footL.z + footR.z) / 2;
    root.updateMatrixWorld(true);
  };

  // Sized and placed by how he stands at the end: his height, his feet on
  // the ground at the origin
  const root = new THREE.Group();
  root.add(model);
  at(MODEL.rise[1] + 1);
  const standing = bounds(model);
  const scale = MODEL.height / (standing.max.y - standing.min.y);
  model.scale.setScalar(scale);
  model.position.set(0, -standing.min.y * scale, 0);

  const chain = GAZE.chain
    .map((link) => {
      let bone: THREE.Object3D | undefined;
      model.traverse((object) => {
        if (!bone && (object as THREE.Bone).isBone && link.bone.test(object.name)) bone = object;
      });
      return bone ? { ...link, object: bone } : null;
    })
    .filter((link): link is NonNullable<typeof link> => !!link);
  const findBone = (end: RegExp) => {
    let found: THREE.Object3D | undefined;
    model.traverse((object) => {
      if (!found && (object as THREE.Bone).isBone && end.test(object.name)) found = object;
    });
    return found;
  };
  const arm = {
    upper: findBone(/RightArm$/),
    lower: findBone(/RightForeArm$/),
    hand: findBone(/RightHand$/),
    finger: findBone(/RightHandIndex2$/),
  };
  let neck: THREE.Object3D | undefined;
  let head: THREE.Object3D | undefined;
  model.traverse((object) => {
    if (!(object as THREE.Bone).isBone) return;
    if (!head && /head$/i.test(object.name)) head = object;
    if (!neck && /neck$/i.test(object.name)) neck = object;
  });
  // The head's own axes, in its own space, found with him standing as the
  // clip ends, looking straight ahead (the model faces +z): which way the
  // face points, and which way is up through the neck. A head turns about
  // the second and nods about the line between its ears; both stay put
  // whatever the body does, so the turn is steady even bent double
  root.updateMatrixWorld(true);
  const facing = new THREE.Vector3(0, 0, 1);
  const crown = new THREE.Vector3(0, 1, 0);
  if (head) {
    const inverse = head.getWorldQuaternion(new THREE.Quaternion()).invert();
    facing.applyQuaternion(inverse);
    crown.applyQuaternion(inverse);
    crown.addScaledVector(facing, -crown.dot(facing)).normalize();
  }
  const leftward = new THREE.Vector3().crossVectors(crown, facing);
  const earToEar = new THREE.Vector3().crossVectors(facing, crown);
  // The mixer only writes a bone when its animated value changes, so while
  // the pose holds still the turn added last frame would still be there and
  // add up, frame after frame. Each frame starts from the clip's own rotation
  const turned = [...new Set([...chain.map((l) => l.object), neck, head, arm.upper, arm.lower, arm.hand])].filter(
    (b): b is THREE.Object3D => !!b,
  );
  const clipRotation = turned.map((b) => b.quaternion.clone());

  const d = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const upAxis = new THREE.Vector3();
  const nodAxis = new THREE.Vector3();
  const headTurn = new THREE.Quaternion();
  const nod = new THREE.Quaternion();
  const clampTo = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const smoothRange = (v: number, a: number, b: number) => {
    const x = clampTo((v - a) / (b - a), 0, 1);
    return x * x * (3 - 2 * x);
  };
  // Turns `bone` `share` of the way from where the head faces to `gaze`,
  // round about its neck and up or down about its ears, within a head's reach
  // The turn each bone has now: it follows where it should be like a neck
  // does, easing in and out and never faster than a head turns, so even when
  // his body swings round as he gets up, the head comes round smoothly
  let last = 0;
  const held = new Map<THREE.Object3D, { yaw: number; tip: number }>();
  let step = 0;
  const follow = (now: number, wanted: number, dt: number, ease: number) => {
    const eased = now + (wanted - now) * (1 - Math.exp(-dt / ease));
    const most = GAZE.speed * dt;
    return now + clampTo(eased - now, -most, most);
  };
  const look = (
    bone: THREE.Object3D,
    gaze: THREE.Vector3,
    share: number,
    turnShare: number,
    ease: number,
    pitchShare: number,
    extraTip = 0,
  ) => {
    head!.getWorldPosition(eye);
    head!.getWorldQuaternion(qa);
    // The point, as the head sees it
    d.copy(gaze).sub(eye).normalize().applyQuaternion(qb.copy(qa).invert());
    let yaw = Math.atan2(d.dot(leftward), d.dot(facing));
    const pitch = Math.atan2(d.dot(crown), Math.hypot(d.dot(leftward), d.dot(facing)));
    // A point almost behind the head: turn less rather than swing from one
    // side to the other
    yaw *= 1 - smoothRange(Math.abs(yaw), THREE.MathUtils.degToRad(115), THREE.MathUtils.degToRad(170));
    // and one almost straight over the crown or under the chin, where which
    // way is round means nothing
    yaw *= smoothRange(Math.cos(pitch), 0.2, 0.55);
    const wantYaw = clampTo(yaw, -GAZE.yaw, GAZE.yaw);
    const wantTip = clampTo(pitch * GAZE.pitchGain, -GAZE.down, GAZE.up);
    // The first frame (or a single still one) starts where it should be
    const state = held.get(bone) ?? { yaw: wantYaw, tip: wantTip };
    held.set(bone, state);
    state.yaw = follow(state.yaw, wantYaw, step, ease);
    state.tip = follow(state.tip, wantTip, step, ease);
    yaw = state.yaw * share * turnShare;
    const tip = state.tip * share * pitchShare + extraTip;
    upAxis.copy(crown).applyQuaternion(qa);
    headTurn.setFromAxisAngle(upAxis, yaw);
    nodAxis.copy(earToEar).applyQuaternion(qa).applyQuaternion(headTurn);
    nod.setFromAxisAngle(nodAxis, tip);
    rotateWorld(bone, nod.multiply(headTurn));
  };

  const clipHead = new THREE.Quaternion();
  const added = new THREE.Quaternion();
  const smoothAdded = new THREE.Quaternion();
  let addedStarted = false;
  // Turns the body, the neck and the head towards the point he looks at
  const aim = (t: number, gaze: THREE.Vector3) => {
    if (!head) return;
    const crouched = smoother(t, GAZE.crouch.down) * (1 - smoother(t, GAZE.crouch.up));
    const w = smoother(t, GAZE.lift) * (1 - (1 - GAZE.crouch.keep) * crouched);
    if (w <= 0) return;
    const turning = smoother(t, GAZE.turn);
    // How upright he is: the body joins in only when he is
    head.getWorldQuaternion(qa);
    const upright = smoothRange(upAxis.copy(crown).applyQuaternion(qa).y, 0.8, 0.95);
    // The arc and the lean of the last look: zero at both ends of it
    const away = clampTo((t - LOOK_AWAY[0]) / (LOOK_AWAY[1] - LOOK_AWAY[0]), 0, 1);
    const swell = Math.sin(Math.PI * away) ** 2;
    for (const link of chain) {
      const isHead = link.object === head;
      const body = link.pitch === 0;
      const share = (body ? link.share * upright : link.share) * w;
      if (share <= 0) continue;
      const dip = isHead ? -GAZE.arcDip * swell : 0;
      look(link.object, gaze, share, turning, link.ease, link.pitch, dip);
    }
    // The lean into the turn, about the way the face points
    if (swell > 0) {
      head.getWorldQuaternion(qa);
      upAxis.copy(facing).applyQuaternion(qa);
      rotateWorld(head, nod.setFromAxisAngle(upAxis, GAZE.lean * swell));
    }
  };

  // Two-bone IK for the right arm: the hand to `target`, the elbow bending
  // in the plane the clip has it bend in, the hand keeping its clip turn
  const s0 = new THREE.Vector3();
  const e0 = new THREE.Vector3();
  const w0 = new THREE.Vector3();
  const goal = new THREE.Vector3();
  const along = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const handTurn = new THREE.Quaternion();
  const swing = new THREE.Quaternion();
  const elbowOut = { dir: new THREE.Vector3(), started: false };
  const outward = new THREE.Vector3();
  const backward = new THREE.Vector3();
  const clipUpper = new THREE.Quaternion();
  const clipLower = new THREE.Quaternion();
  const ikUpper = new THREE.Quaternion();
  const ikLower = new THREE.Quaternion();
  const reachFor = (target: THREE.Vector3, weight: number) => {
    const { upper, lower, hand } = arm;
    if (!upper || !lower || !hand || weight <= 0) return;
    upper.getWorldPosition(s0);
    lower.getWorldPosition(e0);
    hand.getWorldPosition(w0);
    hand.getWorldQuaternion(handTurn);
    const l1 = e0.distanceTo(s0);
    const l2 = w0.distanceTo(e0);
    clipUpper.copy(upper.quaternion);
    clipLower.copy(lower.quaternion);
    along.copy(target).sub(s0);
    // How far the hand is from the shoulder, eased off softly short of the
    // arm's full length, so the elbow never snaps straight and back as his
    // shoulder nears the limit of its reach
    const full = l1 + l2;
    const soft = 0.012;
    const d = Math.max(
      Math.abs(l1 - l2) + 1e-3,
      -soft * Math.log(Math.exp(-along.length() / soft) + Math.exp(-(full * 0.995) / soft)),
    );
    along.normalize();
    // The elbow's way out: the clip's own bend, but while the hand bears his
    // weight, back and out, away from his body, as an arm pushing up does (with the arm nearly straight the clip's bend says
    // little and can turn in towards him). Followed smoothly in time
    bend.copy(e0).sub(s0);
    bend.addScaledVector(along, -bend.dot(along));
    if (bend.lengthSq() > 1e-8) bend.normalize();
    if (arm.upper?.parent?.parent) {
      // Away from his chest (out past the shoulder) and back behind him
      arm.upper.parent.parent.getWorldPosition(outward);
      outward.subVectors(s0, outward).normalize();
      arm.upper.parent.parent.getWorldQuaternion(qa);
      outward.addScaledVector(backward.set(0, 0, -1).applyQuaternion(qa), 1.2);
      outward.addScaledVector(along, -outward.dot(along));
      if (outward.lengthSq() > 1e-8) {
        outward.normalize();
        bend.lerp(outward, weight);
      }
    }
    bend.addScaledVector(along, -bend.dot(along));
    if (bend.lengthSq() > 1e-8) {
      bend.normalize();
      if (!elbowOut.started) elbowOut.dir.copy(bend);
      else elbowOut.dir.lerp(bend, 1 - Math.exp(-step / 0.35));
      elbowOut.started = true;
    }
    bend.copy(elbowOut.dir).addScaledVector(along, -elbowOut.dir.dot(along));
    if (bend.lengthSq() < 1e-8) return;
    bend.normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    elbow.copy(s0).addScaledVector(along, a).addScaledVector(bend, h);
    rotateWorld(upper, swing.setFromUnitVectors(from.copy(e0).sub(s0).normalize(), to.copy(elbow).sub(s0).normalize()));
    lower.getWorldPosition(e0);
    hand.getWorldPosition(w0);
    goal.copy(s0).addScaledVector(along, d);
    rotateWorld(lower, swing.setFromUnitVectors(from.copy(w0).sub(e0).normalize(), to.copy(goal).sub(e0).normalize()));
    // Eased in and out of the clip's own arm
    ikUpper.copy(upper.quaternion);
    ikLower.copy(lower.quaternion);
    upper.quaternion.copy(clipUpper).slerp(ikUpper, weight);
    lower.quaternion.copy(clipLower).slerp(ikLower, weight);
    upper.updateMatrixWorld(true);
    // The hand: as the clip turns it, then on the rock as `turn` has it
    hand.getWorldQuaternion(qa);
    rotateWorld(hand, swing.copy(handTurn).multiply(qa.invert()));
    hand.getWorldQuaternion(qa);
    swing.copy(qa).slerp(handOn, weight);
    rotateWorld(hand, qb.copy(swing).multiply(qa.invert()));
  };
  const leaning = (t: number) => smoother(t, HAND_REST.down) * (1 - smoother(t, HAND_REST.off));
  // The hand on the rock at `t`: its turn (into `handOn`) and where the
  // wrist goes (into `wristAt`). Fingers along the stone, palm down on it;
  // as he rises the heel lifts first, the hand rolling up about the
  // fingertips, which stay where they are
  const handOn = new THREE.Quaternion();
  const wristAt = new THREE.Vector3();
  const fingerLocal = new THREE.Vector3();
  const palmLocal = new THREE.Vector3();
  let handLength = 0.1;
  const fx = new THREE.Vector3();
  const fy = new THREE.Vector3();
  const fz = new THREE.Vector3();
  const lx = new THREE.Vector3();
  const mWorld = new THREE.Matrix4();
  const mLocal = new THREE.Matrix4();
  const rollAxis = new THREE.Vector3();
  const rollTurn = new THREE.Quaternion();
  if (arm.hand && arm.finger) {
    root.updateMatrixWorld(true);
    const handWorld = arm.hand.getWorldPosition(new THREE.Vector3());
    const tipWorld = arm.finger.getWorldPosition(new THREE.Vector3());
    // A little past the second knuckle, to the fingertips
    handLength = handWorld.distanceTo(tipWorld) * 1.15;
    fingerLocal.copy(arm.hand.worldToLocal(tipWorld.clone())).normalize();
    palmLocal.copy(HAND_REST.palmLocal).addScaledVector(fingerLocal, -HAND_REST.palmLocal.dot(fingerLocal)).normalize();
  }
  const placeHand = (t: number) => {
    // Fingers and palm, made square to each other
    fy.copy(HAND_REST.fingers).normalize();
    fz.copy(HAND_REST.palm).addScaledVector(fy, -HAND_REST.palm.dot(fy)).normalize();
    // Rolling up onto the fingertips: about the line across the knuckles
    rollAxis.crossVectors(fz, fy).normalize();
    rollTurn.setFromAxisAngle(rollAxis, -HAND_REST.roll * smoother(t, HAND_REST.peel));
    fy.applyQuaternion(rollTurn);
    fz.applyQuaternion(rollTurn);
    fx.crossVectors(fy, fz);
    mWorld.makeBasis(fx, fy, fz);
    lx.crossVectors(fingerLocal, palmLocal);
    mLocal.makeBasis(lx, fingerLocal, palmLocal);
    // world = handOn · local, so handOn = world · local⁻¹
    handOn.setFromRotationMatrix(mWorld.multiply(mLocal.transpose()));
    wristAt.copy(HAND_REST.tips).addScaledVector(fy, -handLength);
  };

  // The idle layer: about the body's own axes (as he stands now)
  const bodyUp = new THREE.Vector3();
  const bodySide = new THREE.Vector3();
  const bodyFront = new THREE.Vector3();
  const idleTurn = new THREE.Quaternion();
  const spine1 = chain.find((l) => /Spine1$/.test(l.object.name))?.object;
  const spine2 = chain.find((l) => /Spine2$/.test(l.object.name))?.object;
  const about = (bone: THREE.Object3D | undefined, axis: THREE.Vector3, angle: number) => {
    if (bone && angle) rotateWorld(bone, idleTurn.setFromAxisAngle(axis, angle));
  };
  const idle = (t: number) => {
    const w = smoother(t, IDLE.start);
    if (w <= 0) return;
    model.getWorldQuaternion(qa);
    bodyUp.set(0, 1, 0).applyQuaternion(qa);
    bodySide.set(1, 0, 0).applyQuaternion(qa);
    bodyFront.set(0, 0, 1).applyQuaternion(qa);
    // Breathing: in a little quicker than out
    const phase = (t / IDLE.breath.period) % 1;
    const breath = Math.sin(TAU * phase - 0.35 * Math.sin(TAU * phase)) * w;
    about(spine1, bodySide, -IDLE.breath.chest * 0.4 * breath);
    about(spine2, bodySide, -IDLE.breath.chest * 0.6 * breath);
    // Weight shifting over the feet
    const sway = wander(t, IDLE.sway.period, IDLE.sway.period * 1.73, 0.4) * w;
    about(spine1, bodyFront, IDLE.sway.roll * sway);
    about(spine2, bodyUp, IDLE.sway.turn * wander(t, 11.3, 6.7, 2.2) * w);
    // The head drifting, against the sway so it stays level
    if (head) {
      about(head, bodyUp, IDLE.head.turn * wander(t, 9.7, 5.3, 1.1) * w);
      about(head, bodySide, IDLE.head.nod * wander(t, 7.9, 4.1, 3.0) * w);
      about(head, bodyFront, -IDLE.sway.roll * 0.6 * sway);
    }
  };

  return {
    root,
    update(t, gaze) {
      // Time since the last frame (none when the intro starts again)
      step = t < last ? 0 : Math.min(0.1, t - last);
      const restart = t < last || t === 0;
      if (restart) {
        held.clear();
        elbowOut.started = false;
      }
      last = t;
      turned.forEach((b, i) => b.quaternion.copy(clipRotation[i]));
      at(t);
      turned.forEach((b, i) => clipRotation[i].copy(b.quaternion));
      model.rotation.y = GAZE.pivot.angle * smoother(t, GAZE.pivot.during);
      plant();
      if (!head) return;
      root.updateMatrixWorld(true);
      head.getWorldQuaternion(clipHead);
      if (gaze) aim(t, gaze);
      root.updateMatrixWorld(true);
      if (leaning(t) > 0) placeHand(t);
      reachFor(wristAt, leaning(t));
      // What the look adds to the head, eased in time like a damped spring:
      // whatever changes what he means to look at (giving way to the clip as
      // he crouches, taking the chart up again, a new place to look), the
      // head goes there smoothly, while the clip's own movement passes through
      head.getWorldQuaternion(qa);
      added.copy(qa).multiply(qb.copy(clipHead).invert());
      if (restart || !addedStarted) smoothAdded.copy(added);
      else smoothAdded.slerp(added, 1 - Math.exp(-step / GAZE.settle));
      addedStarted = true;
      rotateWorld(head, qb.copy(smoothAdded).multiply(clipHead).multiply(qa.invert()));
      idle(t);
    },
    dispose() {
      mixer.stopAllAction();
      model.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
      });
      for (const m of owned) {
        for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
        m.dispose();
      }
    },
  };
}
