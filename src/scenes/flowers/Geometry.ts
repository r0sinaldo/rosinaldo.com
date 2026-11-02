import * as THREE from "three";
import { type LeafForm, PETIOLE } from "./Config";

type GridPoint = { position: [number, number, number]; uv: [number, number] };

// A surface from a grid of (columns + 1) × (rows + 1) points, two triangles per
// cell. `inward` flips their winding (and so the normals) for closed shapes
// whose points run the other way around
function gridGeometry(columns: number, rows: number, point: (i: number, j: number) => GridPoint, inward = false) {
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) {
      const { position, uv } = point(i, j);
      positions.push(...position);
      uvs.push(...uv);
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * (columns + 1) + i;
      const b = a + columns + 1;
      if (inward) indices.push(a, b, a + 1, b, b + 1, a + 1);
      else indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

// A leaf one unit long, stalk at the origin, growing up (+y), face toward +z.
// The surface is a plain rectangle in the photo's proportions (`aspect`): the
// photo's transparency cuts the leaf's outline out of it. It arches up off the
// stalk then droops, cups across, twists along its length and ripples at the edges
export function createLeafGeometry({ cup, droop, twist }: LeafForm, aspect: number) {
  const blade = 1 - PETIOLE;
  const halfWidth = (aspect / 2) * blade;
  return gridGeometry(16, 40, (i, j) => {
    const u = (i / 16) * 2 - 1;
    const v = j / 40;
    const lift = 0.16 * v * (1 - v) - droop * v * v;
    const angle = twist * v;
    const x = u * halfWidth;
    const curl = cup * u * u * halfWidth + 0.012 * Math.sin(v * 23 + u * 2) * Math.abs(u) ** 3;
    return {
      position: [
        x * Math.cos(angle) - curl * Math.sin(angle),
        PETIOLE + v * blade,
        lift + x * Math.sin(angle) + curl * Math.cos(angle),
      ],
      uv: [u * 0.5 + 0.5, v],
    };
  });
}

// The leaf stalk, from the stem to the blade
export function createPetioleGeometry() {
  const geometry = new THREE.CylinderGeometry(0.008, 0.014, PETIOLE + 0.01, 10, 1, true);
  geometry.translate(0, (PETIOLE + 0.01) / 2, 0);
  return geometry;
}

// A tube along `curve`, tapering from `base` to `top` radius and swelling a
// little at the `nodes` (0–1 along it) where leaves grow. UVs: x along, y around
export function createStemGeometry(curve: THREE.Curve<THREE.Vector3>, base: number, top: number, nodes: number[]) {
  const segments = 48;
  const radial = 14;
  const frames = curve.computeFrenetFrames(segments, false);
  const point = new THREE.Vector3();
  return gridGeometry(
    radial,
    segments,
    (j, i) => {
      const t = i / segments;
      curve.getPointAt(t, point);
      const swell = nodes.reduce((sum, at) => sum + Math.exp(-(((t - at) / 0.025) ** 2)) * 0.35, 0);
      const radius = THREE.MathUtils.lerp(base, top, t ** 0.8) * (1 + swell);
      const angle = (j / radial) * Math.PI * 2;
      const offset = frames.normals[i]
        .clone()
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[i], Math.sin(angle))
        .multiplyScalar(radius);
      return { position: [point.x + offset.x, point.y + offset.y, point.z + offset.z], uv: [t, j / radial] };
    },
    true,
  );
}

// A sepal, one unit long: lance-shaped, folded into a shallow V along its
// midrib, the tip drooping back
export function createSepalGeometry() {
  return gridGeometry(10, 28, (i, j) => {
    const u = (i / 10) * 2 - 1;
    const v = j / 28;
    const width = 0.2 * Math.sin(Math.PI * v ** 0.72) ** 0.9;
    const fold = 0.9 * Math.abs(u) * width;
    const droop = 0.28 * v * v;
    const ripple = 0.012 * Math.sin(v * 19) * Math.abs(u) ** 3;
    return { position: [u * width, v, fold - droop + ripple], uv: [u * 0.5 + 0.5, v] };
  });
}

// A unit quad standing on its base: the petal shaders bend it and cut its outline
export function createPetalGeometry() {
  const geometry = new THREE.PlaneGeometry(1, 1, 4, 10);
  geometry.translate(0, 0.5, 0);
  return geometry;
}

// Points whose only data is a random seed each: the shader places and animates
// them. Positions stay zero, but three needs the attribute to know the count
export function createSeedGeometry(count: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute(
    "aSeed",
    new THREE.BufferAttribute(
      new Float32Array(count * 4).map(() => Math.random()),
      4,
    ),
  );
  return geometry;
}
