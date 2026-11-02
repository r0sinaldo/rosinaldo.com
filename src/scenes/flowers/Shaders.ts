// Colours in these shaders are written as sRGB; three works in linear light
// and converts on output, so they go through this first or they'd look washed out
const toLinear = `
vec3 toLinear(vec3 c) {
  return pow(c, vec3(2.2));
}
`;

// Injected into MeshStandardMaterial (see Materials.ts), so stems keep three's
// lighting: darker at the base, fresher toward the flower, with fine ridges
export const stemShade = `
  float along = vUv.x;
  diffuseColor.rgb *= mix(vec3(0.62, 0.66, 0.6), vec3(1.18, 1.16, 0.82), smoothstep(0.0, 1.0, along));
  diffuseColor.rgb *= 0.93 + 0.07 * sin(vUv.y * 6.28318 * 11.0);
`;

export const sepalFunctions = `
float leafLine(float d, float width) {
  return 1.0 - smoothstep(0.0, width, abs(d));
}
`;

// Sepals are too small for the leaf photo to read, so they are drawn here:
// serrated margin (discarded), pale midrib and veins, a paler underside
export const sepalShade = `
  float across = vUv.x * 2.0 - 1.0;
  float along = vUv.y;
  float teeth = 0.07 * fract(along * 26.0) * smoothstep(0.05, 0.25, along) * (1.0 - smoothstep(0.85, 1.0, along));
  if (abs(across) > 1.0 - teeth) discard;
  float side = abs(across);
  float midrib = leafLine(across, 0.035 * (1.0 - along * 0.7));
  float veins = leafLine(fract((along - side * 0.32) * 9.0) - 0.5, 0.05) * smoothstep(0.08, 0.2, side) * (1.0 - side);
  vec3 tint = vec3(1.0);
  tint = mix(tint, vec3(1.32, 1.3, 1.02), midrib * 0.75);
  tint = mix(tint, vec3(1.14, 1.13, 1.0), veins * 0.55);
  tint *= mix(1.0, 0.86, smoothstep(0.55, 1.0, side));
  tint = mix(tint, tint * vec3(1.15, 1.12, 0.7), smoothstep(0.75, 1.0, max(side, along)) * 0.5);
  if (!gl_FrontFacing) tint *= vec3(1.22, 1.24, 1.12);
  diffuseColor.rgb *= tint;
`;

// Petals are flat quads bent here: cupped along their length and curled
// across. They carry their own simple lighting (vShade) instead of three's,
// which is far cheaper for ~300 instanced petals
export const petalVertex = `
uniform float uCup;
varying vec2 vUv;
varying float vShade;

void main() {
  vUv = uv;
  vec3 p = position;
  float across = p.x * 2.0;
  p.z += uCup * p.y * p.y - 0.14 * across * across * p.y;

  mat4 model = modelMatrix;
  #ifdef USE_INSTANCING
  model = modelMatrix * instanceMatrix;
  #endif
  vec3 normal = normalize(mat3(model) * vec3(-0.28 * across * p.y, -2.0 * uCup * p.y, 1.0));
  vShade = 0.6 + 0.4 * max(dot(normal, normalize(vec3(0.3, 0.7, 1.0))), 0.0);
  gl_Position = projectionMatrix * viewMatrix * model * vec4(p, 1.0);
}
`;

// The petal's outline is cut from the quad here (a teardrop, widest two
// thirds up). uDepth darkens the inner ring, which sits deeper in the flower
export const petalFragment = `
uniform vec3 uColor;
uniform float uDepth;
varying vec2 vUv;
varying float vShade;
${toLinear}

void main() {
  // Edge pixels can sample uvs just outside [0, 1]; pow() of a negative is NaN,
  // which would slip past the discard
  float y = clamp(vUv.y, 0.0, 1.0);
  float x = vUv.x * 2.0 - 1.0;
  float width = pow(max(sin(3.14159 * pow(y, 0.85)), 0.0), 0.75) * (0.45 + 0.55 * y);
  float edge = width - abs(x);
  if (edge < 0.0) discard;

  vec3 base = uColor * mix(0.35, 0.55, uDepth);
  vec3 tip = mix(uColor, vec3(1.0), 0.28);
  vec3 color = mix(base, tip, smoothstep(0.0, 0.85, y));
  float fan = abs(sin(x / max(width, 0.08) * 7.0));
  color *= 1.0 - (1.0 - smoothstep(0.0, 0.18, fan)) * 0.12 * (1.0 - y);
  color *= 1.0 - (1.0 - smoothstep(0.0, 0.04, abs(x))) * 0.2 * (1.0 - y);
  // Light glowing through the thin rim
  color += uColor * (1.0 - smoothstep(0.0, 0.1, edge)) * 0.3;

  gl_FragColor = vec4(toLinear(color * vShade), 1.0);
  #include <colorspace_fragment>
}
`;

// Particles move entirely on the GPU, from a random seed per point and the
// time; the CPU only advances uTime. Sizes scale with distance (4.5 is the
// camera's) and the pixel ratio, so they look the same on any screen
export const pollenVertex = `
uniform float uTime;
uniform float uPixelRatio;
attribute vec4 aSeed;
varying float vAlpha;

void main() {
  float life = fract(uTime * (0.05 + aSeed.z * 0.05) + aSeed.x);
  vec3 p = vec3(
    (aSeed.x - 0.5) * 6.4 + sin(uTime * 0.6 + aSeed.y * 20.0) * 0.15,
    -1.6 + life * 3.6,
    (aSeed.y - 0.5) * 1.5
  );
  vAlpha = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.75, 1.0, life));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (2.0 + aSeed.z * 3.0) * uPixelRatio * (4.5 / -mv.z);
}
`;

// Output is premultiplied (and the material set to match): the colour
// conversion happens before multiplying by alpha, so faint pixels stay faint
export const pollenFragment = `
varying float vAlpha;
${toLinear}

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float alpha = (1.0 - smoothstep(0.1, 0.5, d)) * vAlpha * 0.8;
  gl_FragColor = vec4(toLinear(vec3(1.0, 0.93, 0.6)), 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * alpha, alpha);
}
`;

// Real fireflies don't blink like a lamp: each flash rises fast and fades
// slowly, then stays dark. Periods of 2.8–6.4 s, and about 30% flash twice,
// as some species do
export const fireflyVertex = `
uniform float uTime;
uniform float uPixelRatio;
attribute vec4 aSeed;
varying float vGlow;

float flash(float t, float period, float offset, float twice) {
  float c = mod(t + offset * period, period);
  float pulse = smoothstep(0.0, 0.12, c) * exp(-max(c - 0.12, 0.0) * 3.2);
  float second = c - 0.55;
  pulse += twice * smoothstep(0.0, 0.1, second) * exp(-max(second - 0.1, 0.0) * 5.0);
  return clamp(pulse, 0.0, 1.0);
}

void main() {
  vec3 home = vec3((aSeed.x - 0.5) * 6.6, -1.5 + aSeed.y * 3.1, (aSeed.z - 0.5) * 2.4);
  float t = uTime;
  float k = aSeed.w * 40.0;
  // Slow loops with a little flutter on top: a lazy, wandering flight
  vec3 drift = vec3(
    sin(t * (0.23 + aSeed.x * 0.1) + k) * 0.38 + sin(t * 0.81 + k * 1.7) * 0.07,
    sin(t * (0.19 + aSeed.y * 0.1) + k * 2.3) * 0.26 + sin(t * 1.13 + k) * 0.04,
    sin(t * (0.17 + aSeed.z * 0.1) + k * 0.7) * 0.35
  );
  vec4 mv = modelViewMatrix * vec4(home + drift, 1.0);
  gl_Position = projectionMatrix * mv;

  float period = 2.8 + fract(aSeed.w * 7.31) * 3.6;
  float twice = step(0.7, fract(aSeed.w * 3.17));
  vGlow = flash(t, period, aSeed.w, twice);
  // The point only grows while lit, to fit the halo
  gl_PointSize = (8.0 + 64.0 * vGlow) * uPixelRatio * (4.5 / -mv.z);
}
`;

// A near-white core in a yellow-green halo (bioluminescence peaks around
// 560 nm). When dark, a faint ember stays. Drawn additively, so nearby
// glows brighten each other
export const fireflyFragment = `
varying float vGlow;
${toLinear}

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float core = exp(-d * d * 40.0) * 1.4;
  float halo = exp(-d * d * 4.0) * 0.55;
  float light = (core + halo) * vGlow + core * 0.06;
  vec3 color = mix(vec3(0.74, 1.0, 0.28), vec3(1.0, 1.0, 0.82), core);
  gl_FragColor = vec4(toLinear(color), 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * light, light);
}
`;
