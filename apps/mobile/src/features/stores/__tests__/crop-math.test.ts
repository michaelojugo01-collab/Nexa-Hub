import { clampZoom, cropRect, maxOffset } from '../images/crop-math';

const photo = { width: 4000, height: 3000 }; // landscape phone photo
const square = { width: 300, height: 300 };
const banner = { width: 300, height: 100 };

describe('crop math', () => {
  it('centres a cover-fitted square crop at zoom 1', () => {
    expect(cropRect(photo, square, 1, 0, 0)).toEqual({
      originX: 500,
      originY: 0,
      width: 3000,
      height: 3000,
    });
  });

  it('centres a 3:1 banner crop at zoom 1', () => {
    expect(cropRect(photo, banner, 1, 0, 0)).toEqual({
      originX: 0,
      originY: 833,
      width: 4000,
      height: 1333,
    });
  });

  it('zooming in crops a smaller centred area', () => {
    expect(cropRect(photo, square, 2, 0, 0)).toEqual({
      originX: 1250,
      originY: 750,
      width: 1500,
      height: 1500,
    });
  });

  it('dragging right shows more of the left side, clamped to the edge', () => {
    const max = maxOffset(photo, square, 1);
    expect(max).toEqual({ x: 50, y: 0 });
    expect(cropRect(photo, square, 1, 50, 0).originX).toBe(0);
    expect(cropRect(photo, square, 1, 999, 999)).toEqual(cropRect(photo, square, 1, 50, 0));
    expect(cropRect(photo, square, 1, -999, 0).originX).toBe(1000);
  });

  it('keeps zoom between 1 and 4 and the rect inside the image', () => {
    expect(clampZoom(0.2)).toBe(1);
    expect(clampZoom(9)).toBe(4);
    const r = cropRect({ width: 500, height: 2000 }, banner, 10, -1e6, 1e6);
    expect(r.originX).toBeGreaterThanOrEqual(0);
    expect(r.originY).toBeGreaterThanOrEqual(0);
    expect(r.originX + r.width).toBeLessThanOrEqual(500);
    expect(r.originY + r.height).toBeLessThanOrEqual(2000);
  });
});
