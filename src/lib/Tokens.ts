// The site's colours (see globals.css), as the page has them now, light or
// dark, for drawing on canvases
export function readTokens() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    background: token("--background"),
    foreground: token("--foreground"),
    line: token("--line"),
    faint: token("--faint"),
    muted: token("--muted"),
  };
}

// A #rrggbb colour as its three rgbChannels, 0–255
export function rgbChannels(hex: string): [number, number, number] {
  const value = parseInt(hex.replace("#", ""), 16);
  return [value >> 16, (value >> 8) & 255, value & 255];
}
