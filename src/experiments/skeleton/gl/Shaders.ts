// The GLSL for the WebGL skeletons. Everything works in the post's CSS pixels,
// y down, and in premultiplied colour

const COMMON = /* glsl */ `
uniform vec2 uSize;
uniform float uProgress;
uniform float uTime;
uniform vec3 uBackground;
uniform vec3 uForeground;
uniform vec4 uPost;
varying vec2 vUv;

const float PI = 3.14159265;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

float easeInOut(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

// A texture at a point given in CSS pixels
vec4 at(sampler2D map, vec2 px, float lod) {
  return textureLod(map, vec2(px.x / uSize.x, 1.0 - px.y / uSize.y), lod);
}

vec2 pixel() {
  return vec2(vUv.x, 1.0 - vUv.y) * uSize;
}

// Premultiplied a over b
vec4 over(vec4 a, vec4 b) {
  return a + b * (1.0 - a.a);
}
`;

export const QUAD = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Frost: the placeholder is the bones seen through frosted glass, its vapour
// breathing. When the content lands it comes up behind the frost, then the
// glass clears: drops run down leaving clear trails, magnifying what is under
// them, and the rest thaws away in patches
export const FROST = /* glsl */ `
${COMMON}
uniform sampler2D uContent;
uniform sampler2D uBones;

float roundedBox(vec2 p, vec2 extent, float radius) {
  vec2 q = abs(p) - extent + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

vec4 blurred(sampler2D map, vec2 px, float radius) {
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 12; i++) {
    float angle = float(i) * 2.39996;
    float r = sqrt((float(i) + 0.5) / 12.0) * radius;
    sum += at(map, px + vec2(cos(angle), sin(angle)) * r, 2.0);
  }
  return sum / 12.0;
}

float wobble(float y, float a, float b) {
  return sin(y * 0.07 + a * 40.0) * 1.2 + sin(y * 0.021 + b * 9.0) * 2.4;
}

void main() {
  vec2 px = pixel();
  float p = uProgress;
  vec2 centre = uPost.xy + uPost.zw * 0.5;
  float pane = 1.0 - smoothstep(-0.75, 0.75, roundedBox(px - centre, uPost.zw * 0.5 + 12.0, 16.0));

  // Behind the glass: the bones, then the content, arriving behind the frost
  vec4 bones = vec4(uForeground, 1.0) * 0.08 * blurred(uBones, px, 8.0).a;
  vec4 behind = mix(bones, blurred(uContent, px, 8.0), smoothstep(0.0, 0.3, p));

  // The frost, its vapour drifting and breathing
  float breath = 0.5 + 0.5 * sin(uTime * 2.0 * PI / 2.8);
  float vapour = fbm(px * 0.018 + vec2(uTime * 0.03, -uTime * 0.05));
  float haze = pane * clamp(0.6 + (vapour - 0.5) * 0.35 + breath * 0.07, 0.0, 1.0);
  vec4 frosted = over(vec4(uBackground, 1.0) * haze, behind);
  frosted.rgb += pane * (hash(floor(px * 2.0)) - 0.5) * 0.018;

  // Beads of condensation scattered over it, lit from above
  vec2 cell = floor(px / 7.0);
  vec2 inCell = fract(px / 7.0);
  vec2 beadCentre = vec2(hash(cell + 1.7), hash(cell + 9.2)) * 0.6 + 0.2;
  float beadRadius = mix(0.06, 0.15, hash(cell + 5.5));
  float bead = step(0.5, hash(cell + 3.1)) * (1.0 - smoothstep(beadRadius - 0.04, beadRadius, length(inCell - beadCentre)));
  float beadShade = clamp((inCell.y - beadCentre.y) / beadRadius, -1.0, 1.0);
  frosted.rgb = mix(frosted.rgb, mix(vec3(1.0), uForeground, 0.18 + 0.2 * beadShade) * frosted.a, bead * 0.22 * pane);

  // Drops running down, each leaving a clear trail
  float clear = 0.0;
  vec2 lens = vec2(0.0);
  float shine = 0.0;
  float rim = 0.0;
  float inDrop = 0.0;
  for (int i = 0; i < 14; i++) {
    float n = float(i);
    float a = hash(vec2(n, 1.3));
    float b = hash(vec2(n, 7.7));
    float start = 0.12 + 0.4 * b;
    float t = max(p - start, 0.0) / (1.0 - start);
    if (t <= 0.0) continue;
    float radius = 2.0 + 2.0 * hash(vec2(n, 11.1));
    float x = uPost.x - 4.0 + a * (uPost.z + 8.0);
    float top = uPost.y - 6.0 + hash(vec2(n, 3.9)) * uPost.w * 0.55;
    // Slow to start, then gathering pace, as a drop does once it breaks free
    float y = top + t * 10.0 + t * t * uPost.w * 1.4;
    float width = radius * 0.85 * smoothstep(top - 2.0, top + 10.0, px.y);
    float trail = step(top, px.y) * step(px.y, y) * (1.0 - smoothstep(width - 0.8, width + 0.6, abs(px.x - x - wobble(px.y, a, b))));
    clear = max(clear, trail);
    vec2 drop = vec2(x + wobble(y, a, b), y);
    vec2 q = (px - drop) / vec2(radius, radius * 1.15);
    float d = length(q);
    if (d < 1.0) {
      clear = 1.0;
      // A drop is a small lens: what is under it is magnified, its edge
      // bends the light away in a thin dark ring, and it catches a highlight
      lens = (drop - px) * 0.4;
      inDrop = 1.0;
      shine = max(shine, smoothstep(0.42, 0.0, length(q - vec2(-0.3, -0.38))));
      // light gathered on the far side, as a caustic
      shine = max(shine, 0.45 * smoothstep(0.45, 0.9, d) * smoothstep(0.1, 0.6, q.y) * (1.0 - smoothstep(0.9, 1.0, d)));
      rim = max(rim, smoothstep(0.75, 1.0, d));
    }
  }

  // And the rest thawing on its own through the second half, unevenly but
  // softly, as breath leaves a window
  float thaw = (p - 0.45) / 0.55 * 1.3 - 0.15;
  float field = fbm(px * 0.012 + 7.0);
  clear = max(clear, smoothstep(field - 0.18, field + 0.18, thaw));

  vec4 sharp = at(uContent, px + lens, 0.0);
  // Water is not quite clear: a drop keeps a little of the frost's light
  sharp = mix(sharp, frosted, inDrop * 0.3);
  vec4 color = mix(frosted, sharp, clear);
  color = mix(color, vec4(uForeground, 1.0) * 0.5, rim * 0.18 * pane);
  color = over(vec4(1.0) * shine * 0.7 * pane, color);
  gl_FragColor = color;
}
`;

// Dust: the placeholder is a fine grain of points, drifting and breathing.
// When the content lands each point is carried on a swirl to a point of the
// content, taking its colour, top of the post first
export const DUST_VERTEX = /* glsl */ `
attribute vec2 home;
attribute vec2 target;
attribute vec3 tint;
attribute vec2 seed;
uniform vec2 uSize;
uniform float uProgress;
uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uForeground;
varying vec4 vColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  float delay = 0.4 * (target.y / uSize.y) + 0.28 * seed.x;
  float t = clamp((uProgress - delay) / 0.3, 0.0, 1.0);
  float e = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;

  vec2 drift = (vec2(noise(home * 0.3 + uTime * 0.4), noise(home * 0.3 + 17.0 + uTime * 0.4)) - 0.5) * 1.2;
  float breath = 0.5 + 0.5 * sin(uTime * 6.2832 / 2.8 - home.y * 0.025);

  vec2 path = mix(home + drift, target, e);
  vec2 swirl = (vec2(noise(path * 0.02 + seed * 9.0 + uTime * 0.3), noise(path * 0.02 + 31.0 + uTime * 0.3)) - 0.5) * 64.0;
  float carry = sin(3.14159265 * e);
  vec2 position = path + (swirl + vec2(0.0, -10.0)) * carry;

  gl_Position = vec4(position.x / uSize.x * 2.0 - 1.0, 1.0 - position.y / uSize.y * 2.0, 0.0, 1.0);
  gl_PointSize = mix(1.3, 1.8, e) * uPixelRatio;
  float alpha = mix(mix(0.1, 0.16, breath), 1.0, smoothstep(0.0, 0.6, e));
  vColor = vec4(mix(uForeground, tint, smoothstep(0.2, 0.9, e)) * alpha, alpha);
}
`;

// Under the dust, the content itself condenses as the last of it lands, so
// the post is whole when the real one takes over
export const DUST_UNDER = /* glsl */ `
${COMMON}
uniform sampler2D uContent;
void main() {
  gl_FragColor = at(uContent, pixel(), 0.0) * smoothstep(0.72, 1.0, uProgress);
}
`;

export const DUST_FRAGMENT = /* glsl */ `
varying vec4 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  gl_FragColor = vColor * smoothstep(0.5, 0.3, d);
}
`;

// Denoise: borrowed from how diffusion models make images. The placeholder is
// the latent, a grain in the shape of the post, quietly resampled. When the
// content lands it is generated out of that noise in visible sampler steps:
// structure first, detail last, the noise falling away until only the post is
// left
export const DENOISE = /* glsl */ `
${COMMON}
uniform sampler2D uContent;
uniform sampler2D uBones;

const float STEPS = 24.0;

// Roughly unit Gaussian noise, one value per channel, fresh for every step
vec3 gaussian(vec2 cell, float step) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float k = float(i);
    sum += vec3(
      hash(cell + vec2(step * 1.37 + k * 7.1, k * 3.7)),
      hash(cell + vec2(k * 3.3, step * 2.11 + k * 5.3)),
      hash(cell + vec2(step * 0.71 + k * 5.9, k * 9.7 + 1.0))
    );
  }
  return (sum - 1.5) * 2.0;
}

void main() {
  vec2 px = pixel();
  float p = uProgress;
  vec2 cell = floor(px / 1.5);
  float bone = at(uBones, px, 1.5).a;

  // Waiting: grey grain in the bones' shapes, resampled ten times a second,
  // breathing a little
  float breath = 0.5 + 0.5 * sin(uTime * 2.0 * PI / 2.8);
  vec3 latent = gaussian(cell, floor(uTime * 10.0));
  vec4 waiting = vec4(uForeground, 1.0) * bone * clamp(0.075 + (0.04 + 0.015 * breath) * latent.x, 0.0, 1.0);

  // Generating: the sampler's steps, so it refines in visible jumps
  float s = p >= 1.0 ? 1.0 : floor(p * STEPS) / STEPS;
  float sigma = pow(1.0 - s, 1.6);
  // Coarse to fine: the content's lowest detail first, its finest last
  vec4 content = at(uContent, px, mix(5.5, 0.0, 1.0 - pow(1.0 - s, 2.2)));
  vec3 colour = content.a > 0.002 ? content.rgb / content.a : uForeground;
  // Mostly grey noise with a little colour in it: the look of a sampler's
  // early steps, kept quiet
  vec3 noise = gaussian(cell, floor(p * STEPS) + 100.0);
  noise = mix(vec3(noise.x), noise, 0.35);
  colour = clamp(colour + noise * sigma * 0.38, 0.0, 1.0);
  // The bones' shapes give way to the content's well before the end, so no
  // grey is left behind the text
  float alpha = mix(bone * 0.4, content.a, smoothstep(0.05, 0.7, s));
  vec4 generating = vec4(colour * alpha, alpha);

  gl_FragColor = mix(waiting, generating, smoothstep(0.0, 0.1, p));
}
`;
