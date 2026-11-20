// One source of truth for the visible upper A/B building preview.
// Change this ratio to .4, .5 or .6 without recalibrating the 3D camera.
export const BUILDING_PREVIEW_RATIO=0.3;
export const BUILDING_SHEET_RATIO=1-BUILDING_PREVIEW_RATIO;

export function buildingPreviewCenterY(ratio=BUILDING_PREVIEW_RATIO){
 const p=Math.max(.05,Math.min(1,Number.isFinite(ratio)?ratio:BUILDING_PREVIEW_RATIO));
 return p/2; // Fraction measured down from the canvas top.
}
