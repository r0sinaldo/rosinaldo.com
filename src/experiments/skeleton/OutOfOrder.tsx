"use client";

import { BONES, CONTENT, Frame, Layout, Swap, useLoading, usePicture } from "./Skeleton";

// Each part comes from its own request, so they land in their own order:
// the name first, then the picture, the avatar, and the text last
const TIMES = [700, 1200, 1600, 2300];
const ARRIVES = { name: 1, picture: 2, avatar: 3, text: 4 };

export default function OutOfOrder() {
  const { root, arrived, loading, replay } = useLoading(TIMES);
  usePicture(root);
  const has = (part: keyof typeof ARRIVES) => arrived >= ARRIVES[part];
  const waiting = TIMES.length - arrived;

  return (
    <Frame root={root} loading={loading} replay={replay} status={loading ? `${waiting} still on the way` : null}>
      <Layout
        avatar={
          <Swap shown={has("avatar")} bone={BONES.avatar}>
            {CONTENT.avatar}
          </Swap>
        }
        name={
          <Swap shown={has("name")} bone={BONES.name}>
            {CONTENT.name}
          </Swap>
        }
        handle={
          <Swap shown={has("name")} delay={40} bone={BONES.handle}>
            {CONTENT.handle}
          </Swap>
        }
        lines={BONES.lines.map((bone, i) => (
          <Swap key={i} shown={has("text")} delay={40 * i} bone={bone}>
            {CONTENT.lines[i]}
          </Swap>
        ))}
        picture={
          <Swap shown={has("picture")} bone={BONES.picture}>
            {CONTENT.picture}
          </Swap>
        }
      />
    </Frame>
  );
}
