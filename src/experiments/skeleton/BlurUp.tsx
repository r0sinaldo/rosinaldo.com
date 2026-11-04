"use client";

import { BONES, CONTENT, Frame, Layout, Picture, Swap, useLoading, usePicture } from "./Skeleton";

// The text and a tiny preview of the picture come quickly; the picture itself
// takes longer
const TIMES = [700, 2200];
const STAGGER = 50;

export default function BlurUp() {
  const { root, arrived, loading, replay } = useLoading(TIMES);
  usePicture(root);
  const text = arrived >= 1;
  const sharp = arrived >= 2;

  return (
    <Frame root={root} loading={loading} replay={replay} status={text && !sharp ? "Picture on its way" : null}>
      <Layout
        avatar={
          <Swap shown={text} bone={BONES.avatar}>
            {CONTENT.avatar}
          </Swap>
        }
        name={
          <Swap shown={text} delay={STAGGER} bone={BONES.name}>
            {CONTENT.name}
          </Swap>
        }
        handle={
          <Swap shown={text} delay={STAGGER * 2} bone={BONES.handle}>
            {CONTENT.handle}
          </Swap>
        }
        lines={BONES.lines.map((bone, i) => (
          <Swap key={i} shown={text} delay={STAGGER * (3 + i)} bone={bone}>
            {CONTENT.lines[i]}
          </Swap>
        ))}
        picture={
          <>
            <div className="absolute inset-0" style={{ opacity: text ? 0 : 1, transition: `opacity 300ms ease-out` }}>
              {BONES.picture}
            </div>
            {/* The preview: fourteen pixels by six, stretched and blurred over the
                picture's own average colour, so it reads as the picture out of
                focus rather than as a blur of grey */}
            <div
              className="absolute inset-0 overflow-hidden rounded-[10px]"
              style={{
                backgroundColor: "var(--picture-tone)",
                opacity: text ? 1 : 0,
                transition: text ? `opacity 400ms ease-out ${STAGGER * 5}ms` : `opacity 150ms ease-out`,
              }}
            >
              <div
                className="absolute -inset-4 bg-size-[100%_100%] blur-[10px]"
                style={{ backgroundImage: "var(--picture-tiny)" }}
              />
            </div>
            {/* The picture, coming into focus over its preview */}
            <div
              className="absolute inset-0"
              style={{
                opacity: sharp ? 1 : 0,
                filter: sharp ? "blur(0)" : "blur(8px)",
                transition: sharp
                  ? `opacity 500ms ease-out, filter 800ms cubic-bezier(0.23, 1, 0.32, 1)`
                  : `opacity 150ms ease-out`,
              }}
            >
              <Picture />
            </div>
          </>
        }
      />
    </Frame>
  );
}
