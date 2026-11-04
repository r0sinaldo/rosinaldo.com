import { ImageResponse } from "next/og";
import { MARK } from "@/lib/Mark";
import { SITE_FULL_NAME } from "@/lib/Site";

// What the picture shows, as it stands for every page
export const alt = `The letter R, the mark of ${SITE_FULL_NAME}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Every page shares this preview: just the R, on the site's background
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fcfcfc",
      }}
    >
      {/* About a quarter of the height: previews are often cropped to a square
          around the middle, and a larger mark crowds it */}
      <svg width={132} height={152} viewBox={MARK.viewBox}>
        <path d={MARK.path} fill="#202020" />
      </svg>
    </div>,
    size,
  );
}
