// Intrinsic pixel size of the /layouts/* card photos (generated from public/layouts; keep in sync when adding photos).
// Used for width/height attributes so the browser reserves the right aspect ratio before the image loads (no layout shift).
const DIMS = {
 "/layouts/TV/display-shelves.jpg": [
  942,
  607
 ],
 "/layouts/TV/fireplace.jpg": [
  942,
  607
 ],
 "/layouts/TV/floating.jpg": [
  999,
  572
 ],
 "/layouts/TV/full-wall.jpg": [
  942,
  607
 ],
 "/layouts/TV/minimal.jpg": [
  942,
  607
 ],
 "/layouts/TV/storage-wall.jpg": [
  943,
  606
 ],
 "/layouts/door/double-swing.jpg": [
  999,
  572
 ],
 "/layouts/door/folding.jpg": [
  999,
  572
 ],
 "/layouts/door/hidden.jpg": [
  999,
  572
 ],
 "/layouts/door/pivot.jpg": [
  999,
  572
 ],
 "/layouts/door/single-swing.jpg": [
  943,
  606
 ],
 "/layouts/door/sliding.jpg": [
  1002,
  571
 ],
 "/layouts/kitchen/galley.jpg": [
  1017,
  602
 ],
 "/layouts/kitchen/island.jpg": [
  1017,
  602
 ],
 "/layouts/kitchen/l-shape.jpg": [
  1017,
  602
 ],
 "/layouts/kitchen/peninsula.jpg": [
  1017,
  602
 ],
 "/layouts/kitchen/single-wall.jpg": [
  1017,
  602
 ],
 "/layouts/kitchen/u-shape.jpg": [
  1017,
  602
 ],
 "/layouts/office/built-in.jpg": [
  943,
  606
 ],
 "/layouts/office/corner.jpg": [
  943,
  606
 ],
 "/layouts/office/l-shaped.jpg": [
  943,
  606
 ],
 "/layouts/office/minimal.jpg": [
  999,
  572
 ],
 "/layouts/office/storage-desk.jpg": [
  999,
  572
 ],
 "/layouts/office/wall-storage.jpg": [
  943,
  606
 ],
 "/layouts/wardrobe/wardrobe-hinged.jpg": [
  1017,
  602
 ],
 "/layouts/wardrobe/wardrobe-l-shape.jpg": [
  1017,
  602
 ],
 "/layouts/wardrobe/wardrobe-sliding.jpg": [
  1017,
  602
 ],
 "/layouts/wardrobe/wardrobe-straight.jpg": [
  1017,
  602
 ],
 "/layouts/wardrobe/wardrobe-u-shape.jpg": [
  1017,
  602
 ],
 "/layouts/wardrobe/wardrobe-walkin.jpg": [
  1017,
  602
 ]
};
export function layoutImgSize(src) {
  const d = DIMS[src] || [1000, 600];
  return { width: d[0], height: d[1] };
}
