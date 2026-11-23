// Shared food storefront drawing. Brand definitions live under food/;
// facade glass, signage and automatic doors reuse the convenience geometry.
// A building with a convenience store on the same floor keeps that existing
// storefront rather than painting two incompatible facades over each other.
import {paintConvenienceWall} from '../convenience/osm-adapter.js?v=wall-occlusion-v1-20261123';
export function composeFoodStorefrontSpans(convenienceSpans=[],foodSpans=[]){
 const spans=[...(convenienceSpans||[])];
 for(const food of foodSpans||[]){
  if(spans.some(existing=>food.bottom<existing.top-1e-8&&food.top>existing.bottom+1e-8))continue;
  spans.push(food);
 }
 return spans.sort((a,b)=>a.bottom-b.bottom||a.top-b.top);
}
export function paintFoodWall(quad,mesh,a,b,height,baseColor,convenienceSpans,foodSpans,side='side',outward=1,blocked=false){
 return paintConvenienceWall(quad,mesh,a,b,height,baseColor,
  composeFoodStorefrontSpans(convenienceSpans,foodSpans),side,outward,blocked);
}
