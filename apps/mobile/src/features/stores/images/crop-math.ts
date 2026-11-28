/**
 * Geometry for the crop screen, kept pure so it can be tested and shared with gesture
 * worklets. The image is shown "cover"-fitted in a frame, then zoomed (scale ≥ 1) and moved
 * (translate, measured from centred). Everything is clamped so the frame is always filled.
 */

export type Size = { width: number; height: number };
export type CropRect = { originX: number; originY: number; width: number; height: number };

export const MAX_ZOOM = 4;

/** Scale that makes the image just cover the frame. */
export function coverScale(image: Size, frame: Size) {
  'worklet';
  return Math.max(frame.width / image.width, frame.height / image.height);
}

export function clampZoom(zoom: number) {
  'worklet';
  return Math.min(MAX_ZOOM, Math.max(1, zoom));
}

/** Largest allowed shift from centre on each axis at this zoom. */
export function maxOffset(image: Size, frame: Size, zoom: number) {
  'worklet';
  const s = coverScale(image, frame) * zoom;
  return {
    x: Math.max(0, (image.width * s - frame.width) / 2),
    y: Math.max(0, (image.height * s - frame.height) / 2),
  };
}

export function clampOffset(value: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(-max, value));
}

/** The part of the original image (in image pixels) that is inside the frame. */
export function cropRect(
  image: Size,
  frame: Size,
  zoom: number,
  translateX: number,
  translateY: number,
): CropRect {
  const z = clampZoom(zoom);
  const s = coverScale(image, frame) * z;
  const max = maxOffset(image, frame, z);
  const tx = clampOffset(translateX, max.x);
  const ty = clampOffset(translateY, max.y);
  const width = Math.min(image.width, frame.width / s);
  const height = Math.min(image.height, frame.height / s);
  const originX = (max.x - tx) / s;
  const originY = (max.y - ty) / s;
  return {
    originX: Math.round(Math.max(0, Math.min(image.width - width, originX))),
    originY: Math.round(Math.max(0, Math.min(image.height - height, originY))),
    width: Math.round(width),
    height: Math.round(height),
  };
}
