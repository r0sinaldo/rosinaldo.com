// The wet painting's shaders (see Wet). The paint is a picture of its own:
// in red how thick it lies at each point, in alpha how wet it still is (1
// just poured, 0 dry). Its colour is kept apart, in a second picture: the
// colour of the paint poured there last

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
attribute vec3 tint;
uniform vec2 uSize;
varying vec2 vPour;
varying vec3 vTint;
varying float vRadius;
void main() {
  vPour = pour;
  vTint = tint;
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

// The colour of new paint, over whatever colour was there
export const TINT_FRAGMENT = /* glsl */ `
varying vec3 vTint;
varying float vRadius;
void main() {
  float d = length(gl_PointCoord - 0.5) * (vRadius * 2.0 + 2.0);
  float inside = 1.0 - smoothstep(vRadius - 0.75, vRadius + 0.75, d);
  if (inside <= 0.0) discard;
  gl_FragColor = vec4(vTint, inside);
}
`;

// One moment of the paint's life: it dries; and dry paint, in time, sinks
// into the canvas, making room for more. (It runs, too, but that is drawn by
// the hand: see Hand)
export const FLOW = /* glsl */ `
precision highp float;
uniform sampler2D uState;
uniform float uStep;
uniform float uDry;
uniform float uFade;
uniform float uSink;
varying vec2 vUv;

void main() {
  vec4 here = texture2D(uState, vUv);
  float wet = max(0.0, here.a - uStep * uDry);
  float dry = 1.0 - smoothstep(0.0, 0.3, wet);
  float thick = max(0.0, here.r * exp(-uStep * uFade * dry) - uStep * uSink * dry);
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
uniform sampler2D uColour;
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

  float shade = 0.68 + 0.36 * clamp(dot(normal, uLight) / uLight.z, 0.0, 1.3);
  // Dry paint steps back, so what was poured last is what is seen first
  vec3 colour = texture2D(uColour, vUv).rgb;
  // (but keeps its colour: dry enamel is duller, not greyer)
  vec3 paint = colour * shade * mix(0.7, 1.0, smoothstep(0.0, 0.6, wet));
  float gloss = mix(14.0, 70.0, wet);
  float shine = lit(normal, uLight, gloss) * mix(0.1, 0.75, wet);
  // The pointer's lamp, close to the canvas
  vec3 lamp = normalize(vec3((uPointer.xy - vUv / uTexel) * 0.012, 1.0));
  shine += lit(normal, lamp, gloss) * mix(0.15, 0.9, wet) * uPointer.z;

  // Soaked in around it
  float near = 0.0;
  vec3 soaked = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float a = float(i) * 1.5708 + 0.6;
    vec2 p = vUv + vec2(cos(a), sin(a)) * uTexel * 2.5;
    float there = smoothstep(0.012, 0.085, texture2D(uState, p).r);
    near += there;
    soaked += texture2D(uColour, p).rgb * there;
  }
  float soak = 0.2 * near * 0.25 * (1.0 - cover);
  soaked /= max(near, 1e-4);

  gl_FragColor = vec4((paint + shine) * cover + soaked * soak, cover + soak);
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
