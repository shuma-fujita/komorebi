// Shared, renderer-independent wall tint for level-specific facilities.
// The map adapter decides which storeys qualify; this module only paints geometry.
export function paintLoveHotelWall(quad,mesh,a,b,spans,color,outward=1){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
 if(length<1e-8)return;
 const offset=.018;
 const nx=outward*dz/length*offset,nz=-outward*dx/length*offset;
 for(const {bottom,top} of spans||[]){
  if(!(Number.isFinite(bottom)&&Number.isFinite(top)&&top>bottom))continue;
  quad(mesh,[a[0]+nx,bottom,a[1]+nz],[b[0]+nx,bottom,b[1]+nz],
   [b[0]+nx,top,b[1]+nz],[a[0]+nx,top,a[1]+nz],color);
 }
}
