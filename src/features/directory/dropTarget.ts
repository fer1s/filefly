// Fraction of a tile's height added below it as extra drop-target area, so releasing over a
// folder's name label — which sits just under the icon and overflows the tile's own box — still
// targets that folder. Matters most at high zoom, where the icon square is a small part of the
// visible tile.
const LABEL_HIT_RATIO = 0.5;

// The `.dir_entry_item` under the CSS-pixel point (x, y) that satisfies `isTarget`, hit-testing
// the tile plus a label-sized zone beneath it. When several qualify (tiles can crowd/round at
// high zoom), the one whose center is nearest the point wins. Geometry-based on purpose (not
// elementFromPoint) so entries can keep pointer-events:none during a drag — that suppresses their
// hover tooltip. Returns null on empty space, so a drop there still falls through to the current
// directory.
export const entryElementAt = (
  x: number,
  y: number,
  isTarget: (el: HTMLElement) => boolean,
): HTMLElement | null => {
  let best: HTMLElement | null = null;
  let bestDistance = Infinity;
  document.querySelectorAll<HTMLElement>(".dir_entry_item").forEach((el) => {
    const box = el.getBoundingClientRect();
    const bottom = box.bottom + box.height * LABEL_HIT_RATIO;
    if (x < box.left || x > box.right || y < box.top || y > bottom) return;
    if (!isTarget(el)) return;
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const distance = (x - centerX) ** 2 + (y - centerY) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = el;
    }
  });
  return best;
};
