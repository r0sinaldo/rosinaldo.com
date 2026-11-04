"use client";

import { BONES, CONTENT, Frame, Layout, Swap, useLoading, usePicture } from "./Skeleton";

const TIMES = [2000];
// Top to bottom, in reading order, close enough to read as one movement
const STAGGER = 50;

export default function OneLight() {
  const { root, loading, replay } = useLoading(TIMES);
  usePicture(root);
  const shown = !loading;

  return (
    <Frame root={root} loading={loading} replay={replay}>
      <Layout
        avatar={
          <Swap shown={shown} bone={BONES.avatar}>
            {CONTENT.avatar}
          </Swap>
        }
        name={
          <Swap shown={shown} delay={STAGGER} bone={BONES.name}>
            {CONTENT.name}
          </Swap>
        }
        handle={
          <Swap shown={shown} delay={STAGGER * 2} bone={BONES.handle}>
            {CONTENT.handle}
          </Swap>
        }
        lines={BONES.lines.map((bone, i) => (
          <Swap key={i} shown={shown} delay={STAGGER * (3 + i)} bone={bone}>
            {CONTENT.lines[i]}
          </Swap>
        ))}
        picture={
          <Swap shown={shown} delay={STAGGER * 5} bone={BONES.picture}>
            {CONTENT.picture}
          </Swap>
        }
      />
    </Frame>
  );
}
