import * as THREE from "three";
import { type Limb, type Rig, SIZE } from "./Model";

// How the astronaut moves: seated with the knees drawn up and the arms round
// them, then the head turns to the chart, then he rocks forward, pushes up
// off his knees and stands, and settles looking up at the chart. The feet
// stay planted throughout: the hips are moved, and the legs and arms reach
// with two-bone inverse kinematics

type Key = [time: number, value: number];

// A smooth curve through the keys (cubic Hermite with Catmull-Rom tangents
// over uneven times, flat at the ends), so every move eases in and out of the
// next with no corners
function track(keys: Key[]) {
  const slopes = keys.map((_, i) => {
    if (i === 0 || i === keys.length - 1) return 0;
    const [t0, v0] = keys[i - 1];
    const [t1, v1] = keys[i];
    const [t2, v2] = keys[i + 1];
    // Flat where the curve turns, so it never overshoots a key it shouldn't
    const a = (v1 - v0) / (t1 - t0);
    const b = (v2 - v1) / (t2 - t1);
    return a * b <= 0 ? 0 : (a + b) / 2;
  });
  return (t: number) => {
    if (t <= keys[0][0]) return keys[0][1];
    const last = keys.length - 1;
    if (t >= keys[last][0]) return keys[last][1];
    let i = 0;
    while (t > keys[i + 1][0]) i++;
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    const h = t1 - t0;
    const s = (t - t0) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * v0 +
      (s3 - 2 * s2 + s) * h * slopes[i] +
      (-2 * s3 + 3 * s2) * v1 +
      (s3 - s2) * h * slopes[i + 1]
    );
  };
}

const ease = (t: number, a: number, b: number) => {
  const s = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return s * s * (3 - 2 * s);
};

// The hips' path from sitting to standing, the body's forward lean, and the
// curl of the upper back
const hipZ = track([
  [3.0, -0.4],
  [4.2, -0.3],
  [5.1, -0.13],
  [6.3, -0.03],
  [7.4, 0.0],
  [8.2, -0.005],
]);
const hipY = track([
  [3.0, 0.16],
  [4.2, 0.185],
  [5.1, 0.36],
  [6.3, 0.7],
  [7.4, 0.955],
  [8.2, 0.945],
]);
const hipX = track([
  [3.0, 0],
  [4.6, 0.022],
  [6.4, -0.008],
  [8.0, 0],
]);
const lean = track([
  [3.0, 0.3],
  [4.2, 0.78],
  [5.1, 0.8],
  [6.3, 0.36],
  [7.35, -0.045],
  [8.2, 0.02],
]);
const curl = track([
  [3.0, 0.26],
  [4.2, 0.3],
  [5.1, 0.2],
  [6.3, 0.07],
  [7.4, 0],
]);
// Where he looks: across (towards his left, the camera, at first), and up
const gazeYaw = track([
  [0.6, 0.05],
  [2.8, 0.42],
  [4.7, 0.3],
  [7.2, 0.4],
  [9.0, 0.45],
]);
const gazeUp = track([
  [0.6, -0.32],
  [2.8, 0.22],
  [3.6, 0.22],
  [4.7, -0.02],
  [6.0, 0.02],
  [7.1, 0.2],
  [8.8, 0.34],
]);

export const POSE_END = 9;

const FEET = { left: new THREE.Vector3(0.125, SIZE.ankle, 0.02), right: new THREE.Vector3(-0.115, SIZE.ankle, -0.03) };

// Two bones from `a` reaching for `target`: where the joint between them goes,
// bending towards `pole`
function reach(a: THREE.Vector3, target: THREE.Vector3, l1: number, l2: number, pole: THREE.Vector3) {
  const toTarget = target.clone().sub(a);
  const d = Math.min(Math.max(toTarget.length(), 1e-4), l1 + l2 - 1e-4);
  const dir = toTarget.normalize();
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const up = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const bend = pole
    .clone()
    .sub(dir.clone().multiplyScalar(pole.dot(dir)))
    .normalize();
  const joint = a.clone().addScaledVector(dir, along).addScaledVector(bend, up);
  const end = a.clone().addScaledVector(dir, d);
  return { joint, end };
}

// Points a limb from `a` to `b`, its front (local +Z) turned towards `front`
const basis = new THREE.Matrix4();
function aim(object: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, front: THREE.Vector3) {
  object.position.copy(a);
  const y = b.clone().sub(a).normalize();
  let z = front.clone().sub(y.clone().multiplyScalar(front.dot(y)));
  if (z.lengthSq() < 1e-8) z = new THREE.Vector3(0, 0, 1);
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  basis.makeBasis(x, y, z);
  object.quaternion.setFromRotationMatrix(basis);
}
function aimLimb(limb: Limb, a: THREE.Vector3, b: THREE.Vector3, front: THREE.Vector3) {
  aim(limb.group, a, b, front);
}

export function pose(rig: Rig, t: number) {
  const leanNow = lean(t);
  const curlNow = curl(t);
  rig.pelvis.position.set(hipX(t), hipY(t), hipZ(t));
  rig.pelvis.rotation.x = leanNow * 0.3;
  rig.spine.rotation.x = leanNow * 0.7;
  const yaw = gazeYaw(t);
  rig.chest.rotation.set(curlNow, yaw * 0.18, 0);
  // The head keeps its gaze whatever the back does
  rig.head.rotation.order = "YXZ";
  rig.head.rotation.set(-gazeUp(t) - leanNow - curlNow, yaw * 0.82, 0);
  rig.root.updateMatrixWorld(true);

  const knees: Record<"left" | "right", THREE.Vector3> = { left: new THREE.Vector3(), right: new THREE.Vector3() };
  for (const [side, s] of [
    ["left", 1],
    ["right", -1],
  ] as const) {
    const hip = new THREE.Vector3(SIZE.hipJoint.x * s, SIZE.hipJoint.y, 0).applyMatrix4(rig.pelvis.matrix);
    const ankle = FEET[side];
    // Knees go forward and up, and a little out
    const { joint: knee } = reach(hip, ankle, SIZE.thigh, SIZE.shin, new THREE.Vector3(0.16 * s, 0.35, 1));
    knees[side] = knee;
    const kneeFront = knee
      .clone()
      .sub(hip.clone().add(ankle).multiplyScalar(0.5))
      .add(new THREE.Vector3(0, 0, 0.04));
    aimLimb(rig.thigh[side], hip, knee, kneeFront);
    aimLimb(rig.shin[side], knee, ankle, kneeFront);
    rig.foot[side].position.copy(ankle);
  }

  // Hands: clasped round the shins, then on the knees, then pushing down on
  // the thighs, then hanging at the sides
  const toKnee = ease(t, 3.2, 4.2);
  const toThigh = ease(t, 4.3, 5.2);
  const toSide = ease(t, 5.9, 7.4);
  for (const [side, s] of [
    ["left", 1],
    ["right", -1],
  ] as const) {
    const shoulder = rig.root.worldToLocal(rig.shoulders[side].getWorldPosition(new THREE.Vector3()));
    const knee = knees[side];
    const kneeMid = knees.left.clone().add(knees.right).multiplyScalar(0.5);
    const target = new THREE.Vector3(0.05 * s, kneeMid.y - 0.13, kneeMid.z + 0.17)
      .lerp(knee.clone().add(new THREE.Vector3(0.03 * s, 0.085, 0.02)), toKnee)
      .lerp(knee.clone().add(new THREE.Vector3(0.035 * s, 0.075, -0.1)), toThigh)
      .lerp(shoulder.clone().add(new THREE.Vector3(0.045 * s, -0.53, 0.07)), toSide);
    // Elbows out while hugging, back once the arms hang
    const pole = new THREE.Vector3(1 * s, -0.25, 0.15).lerp(new THREE.Vector3(0.35 * s, 0, -1), toSide);
    const { joint: elbow, end: wrist } = reach(shoulder, target, SIZE.upperArm, SIZE.forearm, pole);
    const outward = new THREE.Vector3(s, 0, 0);
    aimLimb(rig.upperArm[side], shoulder, elbow, outward);
    aimLimb(rig.forearm[side], elbow, wrist, outward);
    const along = wrist.clone().sub(elbow).normalize();
    aim(rig.hand[side], wrist, wrist.clone().add(along), outward);
  }

  // The shadow under him: wide while he sits, gathering under his feet
  const standing = ease(t, 4.8, 7.4);
  const centre = rig.pelvis.position.clone().lerp(new THREE.Vector3(0, 0, 0), 0.5 + 0.5 * standing);
  rig.shadow.position.set(centre.x, 0.003, centre.z - 0.02);
  rig.shadow.scale.set(0.95 - 0.35 * standing, 1.25 - 0.62 * standing, 1);
}
