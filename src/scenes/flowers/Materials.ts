import * as THREE from "three";
import leafPhoto from "./leaf.png";

// The leaf is a photo of a real one, prepared as a texture: background cut
// away, midrib upright (base at the bottom, tip at the top), stalk trimmed off.
// Imported rather than served from public/, so its size comes with it
export const LEAF_ASPECT = leafPhoto.width / leafPhoto.height;

// A standard, lit material with extra GLSL run on its colour (`shade`, with
// vUv available). onBeforeCompile keeps all of three's lighting and shadows;
// the cache key keeps each variant from reusing another's compiled program
export function detailedMaterial(color: string, key: string, shade: string, functions = "") {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.62, side: THREE.DoubleSide });
  material.defines = { USE_UV: "" };
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", `${functions}\nvoid main() {`)
      .replace("#include <map_fragment>", `#include <map_fragment>\n${shade}`);
  };
  material.customProgramCacheKey = () => key;
  return material;
}

// The photo is both the colour and the relief: through bumpMap its pale veins
// would rise, so the negative scale sinks them into the surface, as on a real
// leaf. The tint takes the daylight photo down to the night garden. Waxy on
// top, matte and paler underneath, and a little light let through (emissive)
export function leafMaterial(texture: THREE.Texture) {
  const material = new THREE.MeshPhysicalMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: -1.2,
    color: "#d3e0cc",
    alphaTest: 0.5,
    roughness: 0.5,
    clearcoat: 0.25,
    clearcoatRoughness: 0.45,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_fragment>",
        "#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb *= vec3(1.14, 1.18, 1.06);",
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = gl_FrontFacing ? 0.46 : 0.85;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * (gl_FrontFacing ? 0.04 : 0.1);",
      );
  };
  material.customProgramCacheKey = () => "flower-leaf";
  return material;
}

// Loads in the background; until it arrives the leaves are simply not drawn
// (alphaTest discards everything)
export function loadLeafTexture() {
  const texture = new THREE.TextureLoader().load(leafPhoto.src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
