"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CYCLE, type FlowerConfig, INNER_PETALS, LEAVES, OUTER_PETALS, PALETTE, SEPALS, STEM_BOTTOM } from "./Config";
import { createStemGeometry } from "./Geometry";
import { petalFragment, petalVertex } from "./Shaders";

// Geometry and materials shared by every flower, built once by the scene
export type Greenery = {
  petal: THREE.BufferGeometry;
  leaves: THREE.BufferGeometry[];
  petiole: THREE.BufferGeometry;
  sepal: THREE.BufferGeometry;
  stemMaterial: THREE.Material;
  leafMaterial: THREE.Material;
  sepalMaterial: THREE.Material;
};

const easeOutBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

// How open a flower is (0 bud, 1 open) at a point of its cycle (0–1): a pause
// as a bud, a springy opening that overshoots, a long rest open, a gentle close
function bloomAt(u: number) {
  if (u < 0.08) return 0;
  if (u < 0.35) return easeOutBack((u - 0.08) / 0.27);
  if (u < 0.75) return 1;
  if (u < 0.92) return 1 - easeInOutCubic((u - 0.75) / 0.17);
  return 0;
}

// Reused every frame by every flower instead of allocating new ones (17
// flowers × 17 petals × 60 fps would churn the garbage collector)
const petalMatrix = new THREE.Matrix4();
const spin = new THREE.Quaternion();
const lean = new THREE.Quaternion();
const petalScale = new THREE.Vector3();
const origin = new THREE.Vector3();
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const WHITE = new THREE.Color("#ffffff");

// Petal rings: how far they lean out from the flower's axis when closed and
// open (radians), their length, and the inner ring offset half a petal
const PETAL_LAYERS = [
  { count: OUTER_PETALS, closed: 1.35, open: 0.16, length: 0.62, offset: 0 },
  { count: INNER_PETALS, closed: 1.45, open: 0.6, length: 0.42, offset: 0.5 },
];

type FlowerProps = {
  config: FlowerConfig;
  index: number;
  greenery: Greenery;
  reducedMotion: boolean;
};

export default function Flower({ config, index, greenery, reducedMotion }: FlowerProps) {
  const sway = useRef<THREE.Group>(null);
  const outer = useRef<THREE.InstancedMesh>(null);
  const inner = useRef<THREE.InstancedMesh>(null);
  const center = useRef<THREE.Mesh>(null);
  const sepals = useRef<(THREE.Mesh | null)[]>([]);
  const leafMeshes = useRef<(THREE.Group | null)[]>([]);
  const time = useRef(0);
  const [hx, hy, hz] = config.head;
  // Stems lean in toward the middle from a base nearer the centre, so the
  // garden fans out like a bunch rather than standing in parallel
  const base = useMemo(() => new THREE.Vector3(hx * 0.6, STEM_BOTTOM, hz), [hx, hz]);
  const headLocal = useMemo(() => new THREE.Vector3(hx, hy, hz).sub(base), [hx, hy, hz, base]);

  // A gentle S, the last two points bringing the stem into the flower from
  // behind (the head faces the camera)
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        headLocal
          .clone()
          .multiplyScalar(0.3)
          .add(new THREE.Vector3(0.08, 0, 0.02)),
        headLocal
          .clone()
          .multiplyScalar(0.65)
          .add(new THREE.Vector3(-0.1, 0, 0)),
        headLocal.clone().add(new THREE.Vector3(0, -0.12, -0.1)),
        headLocal.clone().add(new THREE.Vector3(0, -0.02, -0.07)),
      ]),
    [headLocal],
  );
  const stem = useMemo(
    () =>
      createStemGeometry(
        curve,
        0.034 * config.size,
        0.018 * config.size,
        LEAVES.map(({ at }) => at),
      ),
    [curve, config.size],
  );

  // Each leaf at its node: aligned with the stem, turned to its side, tipped
  // up and out (-0.85), then turned on its midrib to face the camera
  const leaves = useMemo(
    () =>
      LEAVES.map(({ at, around, turn, size }) => ({
        position: curve.getPointAt(at),
        quaternion: new THREE.Quaternion()
          .setFromUnitVectors(AXIS_Y, curve.getTangentAt(at))
          .multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_Y, around))
          .multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_X, -0.85))
          .multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_Y, turn)),
        scale: 0.95 * size * config.size,
      })),
    [curve, config.size],
  );

  const uniforms = useMemo(
    () => ({
      outer: { uColor: { value: new THREE.Color() }, uCup: { value: 0.35 }, uDepth: { value: 0 } },
      inner: { uColor: { value: new THREE.Color() }, uCup: { value: 0.5 }, uDepth: { value: 1 } },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (!sway.current || !outer.current || !inner.current || !center.current) return;
    time.current += delta * (reducedMotion ? 0.25 : 1);
    const t = time.current + config.phase * CYCLE;
    const cycle = Math.floor(t / CYCLE);
    const bloom = bloomAt((t % CYCLE) / CYCLE);
    // bloom overshoots past 1 on the way open; where that would look wrong, cap it
    const opened = Math.min(bloom, 1);
    const breathe = Math.sin(t * 1.4) * 0.04 * bloom;

    const color = PALETTE[(index * 2 + cycle) % PALETTE.length];
    uniforms.outer.uColor.value.set(color);
    uniforms.inner.uColor.value.set(color).lerp(WHITE, 0.2);

    sway.current.rotation.z = Math.sin(t * 0.8 + index) * 0.035;
    sway.current.rotation.x = Math.sin(t * 0.6 + index * 2) * 0.02;
    center.current.scale.setScalar(0.6 + 0.4 * opened);

    // The sepals cradle the bud, then fold back under the open flower
    const sepalLean = THREE.MathUtils.lerp(1.25, -0.45, opened);
    sepals.current.forEach((mesh, k) => {
      if (!mesh) return;
      const around = ((k + 0.25) / SEPALS) * Math.PI * 2;
      mesh.quaternion.setFromAxisAngle(AXIS_Z, around).multiply(lean.setFromAxisAngle(AXIS_X, sepalLean));
    });
    leafMeshes.current.forEach((leaf, k) => {
      if (leaf) leaf.rotation.x = Math.sin(t * 1.7 + index + k * 2.1) * 0.06;
    });

    for (const [mesh, layer] of [
      [outer.current, PETAL_LAYERS[0]],
      [inner.current, PETAL_LAYERS[1]],
    ] as const) {
      const open = THREE.MathUtils.lerp(layer.closed, layer.open, bloom) + breathe;
      const length = layer.length * config.size * (0.55 + 0.45 * bloom);
      for (let k = 0; k < layer.count; k++) {
        // Petals unfurl with a slight twist as they open
        const around = ((k + layer.offset) / layer.count) * Math.PI * 2 + (1 - bloom) * 0.6;
        spin.setFromAxisAngle(AXIS_Z, around).multiply(lean.setFromAxisAngle(AXIS_X, open));
        mesh.setMatrixAt(k, petalMatrix.compose(origin, spin, petalScale.set(length * 0.62, length, 1)));
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={sway} position={base}>
      <mesh geometry={stem} material={greenery.stemMaterial} />
      {leaves.map((leaf, i) => (
        <group key={i} position={leaf.position} quaternion={leaf.quaternion}>
          <group
            ref={(group) => {
              leafMeshes.current[i] = group;
            }}
          >
            <group scale={leaf.scale}>
              <mesh geometry={greenery.petiole} material={greenery.stemMaterial} />
              <mesh geometry={greenery.leaves[(index + i) % greenery.leaves.length]} material={greenery.leafMaterial} />
            </group>
          </group>
        </group>
      ))}
      <group position={headLocal} rotation={[config.tilt[0], config.tilt[1], 0]}>
        {/* The petals' bounds change every frame, so three's culling would drop them */}
        <instancedMesh ref={outer} args={[greenery.petal, undefined, OUTER_PETALS]} frustumCulled={false}>
          <shaderMaterial
            vertexShader={petalVertex}
            fragmentShader={petalFragment}
            uniforms={uniforms.outer}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
        <instancedMesh
          ref={inner}
          args={[greenery.petal, undefined, INNER_PETALS]}
          position-z={0.02}
          frustumCulled={false}
        >
          <shaderMaterial
            vertexShader={petalVertex}
            fragmentShader={petalFragment}
            uniforms={uniforms.inner}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
        <mesh material={greenery.stemMaterial} position-z={-0.035} scale={[1, 1, 0.75]}>
          <sphereGeometry args={[0.075 * config.size, 20, 14]} />
        </mesh>
        {Array.from({ length: SEPALS }, (_, k) => (
          <mesh
            key={k}
            ref={(mesh) => {
              sepals.current[k] = mesh;
            }}
            geometry={greenery.sepal}
            material={greenery.sepalMaterial}
            position-z={-0.03}
            scale={[0.55 * config.size * 0.32, 0.32 * config.size, 0.32 * config.size]}
          />
        ))}
        <mesh ref={center} position-z={0.06}>
          <icosahedronGeometry args={[0.1 * config.size, 2]} />
          <meshStandardMaterial color="#ffc93c" emissive="#ff8a00" emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}
