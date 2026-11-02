import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/Site";

// The R of the favicon (app/icon.svg), the same path, framed tight around the
// letter so it sits exactly in the middle of the image
const MARK_PATH =
  "M8.5 7.43H17.6A5.29 5.29 0 0 1 17.6 18H12.6V25H8.5ZM12.6 10.93V14.5H17.12A1.79 1.79 0 0 0 17.12 10.93ZM14.2 15.2H18.6L23.7 25H19.3Z";

export const alt = SITE_DESCRIPTION;
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
      <svg width={208} height={240} viewBox="8.5 7.43 15.2 17.57">
        <path d={MARK_PATH} fill="#202020" />
      </svg>
    </div>,
    size,
  );
}
