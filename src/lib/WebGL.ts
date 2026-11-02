let supported: boolean | undefined;

export function supportsWebGL() {
  if (supported === undefined) {
    try {
      const canvas = document.createElement("canvas");
      supported = !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      supported = false;
    }
  }
  return supported;
}
