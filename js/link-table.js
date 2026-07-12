/* link-table.js — derives both the drawn icon positions AND the published
   HTML's sliced-table geometry from one shared per-template config, so the
   two can never drift out of sync (the slice a link points to must be
   exactly where its icon is drawn).

   A template's `linkTable` describes a strip of 3 equal-purpose cells
   (LinkedIn / website / Instagram) running along one edge of the canvas,
   plus one "main" rectangle covering everything else:

     orientation: 'column' | 'row'   — strip runs top-to-bottom or left-to-right
     stripAt:     'start' | 'end'    — strip on the left/top, or right/bottom
     stripSize:   px width (column) or height (row) of the strip
     cellSizes:   [h1,h2,h3] (column) or [w1,w2,w3] (row) — must sum to
                  CFG.H (column) or CFG.W (row)
     iconOffset:  optional — distance from the strip's outer edge to each
                  icon's center along the cross-axis. Defaults to
                  stripSize/2 (icon centered in the strip); set it smaller
                  to left-align icons within a wider strip that also shows
                  label text next to them (see templates/sidebar.js).

   This constrains every template's icons to a straight strip at one edge —
   not a design limitation so much as what makes the "sliced HTML table"
   technique work at all (see publish.js): the table can only cleanly
   reconstruct rectangles that tile the canvas without gaps. */
import { CFG } from './config.js';

export const ICON_SIZE = 20;

export function iconCenters(linkTable){
  const { orientation, stripSize, cellSizes, stripAt, iconOffset } = linkTable;
  const offset = iconOffset != null ? iconOffset : stripSize/2;
  const offsets = []; let acc = 0;
  for(const c of cellSizes){ offsets.push(acc); acc += c; }
  return cellSizes.map((c, i) => {
    const mid = offsets[i] + c/2;
    if(orientation === 'column'){
      const x = stripAt === 'start' ? offset : CFG.W - offset;
      return { x, y: mid };
    }
    const y = stripAt === 'start' ? offset : CFG.H - offset;
    return { x: mid, y };
  });
}

/* Rectangles for the 4 upload slices: 3 icon cells (in cellSizes order)
   plus 1 "main" rect covering everything else. */
export function sliceRects(linkTable){
  const { orientation, stripSize, cellSizes, stripAt } = linkTable;
  const offsets = []; let acc = 0;
  for(const c of cellSizes){ offsets.push(acc); acc += c; }

  const iconRects = cellSizes.map((c, i) => orientation === 'column'
    ? { x: stripAt === 'start' ? 0 : CFG.W - stripSize, y: offsets[i], w: stripSize, h: c }
    : { x: offsets[i], y: stripAt === 'start' ? 0 : CFG.H - stripSize, w: c, h: stripSize }
  );

  const mainRect = orientation === 'column'
    ? { x: stripAt === 'start' ? stripSize : 0, y: 0, w: CFG.W - stripSize, h: CFG.H }
    : { x: 0, y: stripAt === 'start' ? stripSize : 0, w: CFG.W, h: CFG.H - stripSize };

  return { icon: iconRects, main: mainRect };
}
