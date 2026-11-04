"use client";

import { BONES, CONTENT, Frame, Layout, Swap, useLoading, usePicture } from "./Skeleton";

// A slow load: nothing to say at first, a word when it starts to feel long,
// another when it is, then the post
const TIMES = [1600, 3400, 5200];
const NEWS = [null, "Taking a moment…", "Nearly there…"];
const STAGGER = 50;

export default function Patience() {
  const { root, arrived, loading, replay } = useLoading(TIMES);
  usePicture(root);
  const shown = !loading;
  const news = NEWS[arrived];

  return (
    <Frame
      root={root}
      loading={loading}
      replay={replay}
      status={
        // Keyed, so each new message settles in with the label entrance
        news && (
          <span key={news} className="block motion-safe:animate-label">
            {news}
          </span>
        )
      }
    >
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
