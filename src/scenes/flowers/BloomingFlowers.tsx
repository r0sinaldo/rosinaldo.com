"use client";

import { useMemo } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { COLORS, FIREFLIES, FLOWERS, LEAF_FORMS, POLLEN } from "./Config";
import Flower, { type Greenery } from "./Flower";
import { createLeafGeometry, createPetalGeometry, createPetioleGeometry, createSepalGeometry } from "./Geometry";
import { detailedMaterial, LEAF_ASPECT, leafMaterial, loadLeafTexture } from "./Materials";
import Particles from "./Particles";
import {
  fireflyFragment,
  fireflyVertex,
  pollenFragment,
  pollenVertex,
  sepalFunctions,
  sepalShade,
  stemShade,
} from "./Shaders";

// A garden in a loop: flowers bud, spring open, breathe, close and bloom again
// in a new colour, while pollen drifts up and fireflies wander and flash
export function BloomingFlowers() {
  const reducedMotion = useReducedMotion();
  const greenery = useMemo<Greenery>(
    () => ({
      petal: createPetalGeometry(),
      leaves: LEAF_FORMS.map((form) => createLeafGeometry(form, LEAF_ASPECT)),
      petiole: createPetioleGeometry(),
      sepal: createSepalGeometry(),
      stemMaterial: detailedMaterial(COLORS.stem, "flower-stem", stemShade),
      leafMaterial: leafMaterial(loadLeafTexture()),
      sepalMaterial: detailedMaterial(COLORS.sepal, "flower-sepal", sepalShade, sepalFunctions),
    }),
    [],
  );

  return (
    <group>
      <ambientLight intensity={0.55} />
      {/* Night sky above, a little green bounce from the foliage below */}
      <hemisphereLight args={["#eef4ff", "#2b3a26", 0.6]} />
      <directionalLight position={[2, 4, 5]} intensity={1.6} />
      {FLOWERS.map((config, i) => (
        <Flower key={i} config={config} index={i} greenery={greenery} reducedMotion={reducedMotion} />
      ))}
      <Particles
        count={POLLEN}
        vertexShader={pollenVertex}
        fragmentShader={pollenFragment}
        reducedMotion={reducedMotion}
      />
      <Particles
        count={FIREFLIES}
        vertexShader={fireflyVertex}
        fragmentShader={fireflyFragment}
        additive
        reducedMotion={reducedMotion}
      />
    </group>
  );
}
