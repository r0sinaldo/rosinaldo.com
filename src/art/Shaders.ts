// The wet painting's shaders (see Wet). The paint is a picture of its own:
// in red how thick it lies at each point, in alpha how wet it still is (1
// just poured, 0 dry)

export const QUAD = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// New paint: each touch a round spot, laid on top of what is there (thickness
// adds up; wetness takes the wetter of the two). `pour`: how thick, and
// whether it is a drop (domed) rather than a touch of a line (flat)
export const TOUCH_VERTEX = /* glsl */ `
attribute vec2 pour;
uniform vec2 uSize;
varying vec2 vPour;
varying float vRadius;
void main() {
  vPour = pour;
  vRadius = position.z;
  gl_Position = vec4(position.xy / uSize * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = position.z * 2.0 + 2.0;
}
`;

export const TOUCH_FRAGMENT = /* glsl */ `
varying vec2 vPour;
varying float vRadius;
void main() {
  float d = length(gl_PointCoord - 0.5) * (vRadius * 2.0 + 2.0);
  float inside = 1.0 - smoothstep(vRadius - 0.75, vRadius + 0.75, d);
  float dome = sqrt(max(0.0, 1.0 - d * d / (vRadius * vRadius)));
  gl_FragColor = vec4(vPour.x * inside * mix(1.0, dome * 1.5, vPour.y), 0.0, 0.0, inside > 0.0 ? 1.0 : 0.0);
}
`;

// One moment of the paint's life. Wet paint lying thicker than a thin film
// (REST) runs down: the thicker, the faster, so the heart of a drop outruns
// its edges and it draws out into a run, leaving a film behind it and
// stopping where it has spent itself or dried. On its way it wanders a
// little, and is drawn towards thicker paint beside it, as runs join. Thick
// wet paint also levels out a little. All the while it dries; and dry paint,
// in time, sinks into the canvas, making room for more
export const FLOW = /* glsl */ `
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uStep;
uniform float uFlow;
uniform float uDry;
uniform float uFade;
uniform float uSink;
varying vec2 vUv;

const float REST = 0.25;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}
// How much of the paint at a point leaves it this moment
float leaving(vec4 s) {
  float loose = max(s.r - REST, 0.0);
  return loose * min(0.9, uFlow * s.a * loose);
}
float loose(vec2 p) {
  return max(texture2D(uState, p).r - REST, 0.0);
}

void main() {
  vec4 here = texture2D(uState, vUv);
  float gone = leaving(here);

  // What arrives from the three points above
  float come = 0.0;
  float comeWet = 0.0;
  for (int i = -1; i <= 1; i++) {
    vec2 p = vUv + vec2(float(i), 1.0) * uTexel;
    if (p.y > 1.0) continue;
    vec4 above = texture2D(uState, p);
    float sent = leaving(above);
    if (sent <= 0.0) continue;
    float left = texture2D(uState, p - vec2(uTexel.x, 0.0)).r;
    float right = texture2D(uState, p + vec2(uTexel.x, 0.0)).r;
    float wander = noise(p / uTexel * 0.03) * 2.0 - 1.0;
    float toLeft = clamp(max(left - above.r, 0.0) * 0.5 + max(-wander, 0.0) * 0.3, 0.0, 0.45);
    float toRight = clamp(max(right - above.r, 0.0) * 0.5 + max(wander, 0.0) * 0.3, 0.0, 0.45);
    float share = i == -1 ? toRight : (i == 1 ? toLeft : 1.0 - toLeft - toRight);
    come += sent * share;
    comeWet += sent * share * above.a;
  }

  // Levelling: loose paint evens out with the loose paint around it
  float mine = max(here.r - REST, 0.0);
  float around =
    loose(vUv + vec2(uTexel.x, 0.0)) +
    loose(vUv - vec2(uTexel.x, 0.0)) +
    loose(vUv + vec2(0.0, uTexel.y)) +
    loose(vUv - vec2(0.0, uTexel.y));
  float level = 0.06 * here.a * (around - 4.0 * mine);

  float thick = max(0.0, here.r - gone + come + level);
  float wet = mix(here.a, comeWet / max(come, 1e-5), clamp(come / max(thick, 1e-5), 0.0, 1.0));
  wet = max(0.0, wet - uStep * uDry);
  float dry = 1.0 - smoothstep(0.0, 0.3, wet);
  thick = max(0.0, thick * exp(-uStep * uFade * dry) - uStep * uSink * dry);
  gl_FragColor = vec4(thick, 0.0, 0.0, wet);
}
`;

// The paint as it is seen: enamel, off white, with a body. Its thickness is
// its relief, lit by a lamp that goes slowly round and another that follows
// the pointer, so wet paint glints along its edges and dry paint has only a
// satin sheen. Thin paint breaks up over the weave of the canvas; and close
// around every line a little has soaked into it
export const LOOK = /* glsl */ `
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec3 uLight;
uniform vec3 uPointer;
uniform float uRelief;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
// Thick paint is rounded, not spiked: its height levels off
float body(vec2 p) {
  return 1.0 - exp(-texture2D(uState, p).r * 1.7);
}
float lit(vec3 normal, vec3 light, float gloss) {
  return pow(max(dot(normal, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), gloss);
}

void main() {
  vec4 here = texture2D(uState, vUv);
  float thick = here.r;
  float wet = here.a;

  float cover = smoothstep(0.012, 0.085, thick);
  cover *= 1.0 - 0.55 * hash(floor(gl_FragCoord.xy)) * (1.0 - smoothstep(0.03, 0.16, thick));

  vec2 dx = vec2(uTexel.x, 0.0);
  vec2 dy = vec2(0.0, uTexel.y);
  vec3 normal = normalize(
    vec3((body(vUv - dx) - body(vUv + dx)) * uRelief, (body(vUv - dy) - body(vUv + dy)) * uRelief, 1.0)
  );

  float shade = 0.6 + 0.4 * clamp(dot(normal, uLight) / uLight.z, 0.0, 1.3);
  vec3 paint = vec3(0.935, 0.93, 0.905) * shade * mix(0.8, 1.0, wet);
  float gloss = mix(14.0, 70.0, wet);
  float shine = lit(normal, uLight, gloss) * mix(0.1, 0.75, wet);
  // The pointer's lamp, close to the canvas
  vec3 lamp = normalize(vec3((uPointer.xy - vUv / uTexel) * 0.012, 1.0));
  shine += lit(normal, lamp, gloss) * mix(0.15, 0.9, wet) * uPointer.z;

  // Soaked in around it
  float near = 0.0;
  for (int i = 0; i < 4; i++) {
    float a = float(i) * 1.5708 + 0.6;
    near += smoothstep(0.012, 0.085, texture2D(uState, vUv + vec2(cos(a), sin(a)) * uTexel * 2.5).r);
  }
  float soak = 0.2 * near * 0.25 * (1.0 - cover);

  gl_FragColor = vec4((paint + shine) * cover + vec3(0.93) * soak, cover + soak);
}
`;

// The paint as it was, into a canvas of another size
export const COPY = /* glsl */ `
uniform sampler2D uState;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uState, vUv);
}
`;
