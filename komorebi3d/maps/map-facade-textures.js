// Application-owned UV facade renderer for the pinned Komorebi Engine.
// Opaque solid wall bands and PNG logo inlays share one facade plane.
// Keep the fixed Engine mesh contract unchanged.
import {loadWikidataLogo,reportWikidataLogoStage} from './wikidata-logo.js?v=wikidata-logo-pilot-v8-20261128';
// Pilot: reuse the existing local PNG texture keys as reliable fallbacks.
const WIKIDATA_BRANDS=Object.freeze({wikidataQ38076:'Q38076',lawson:'Q1557223',misterDonut:'Q1065819'});
const TEXTURE_URLS=Object.freeze({
 wikidataQ38076:new URL('../assets/textures/brands/mcdonalds.png',import.meta.url).href,
 toyokoInn:new URL('../assets/textures/brands/toyoko-inn.png?v=toyoko-inn-v1-20261128',import.meta.url).href,
 matsumotoKiyoshi:new URL('../assets/textures/brands/matsumoto-kiyoshi.png?v=matsumoto-kiyoshi-v1-20261127',import.meta.url).href,
 manekineko:new URL('../assets/textures/brands/manekineko.png?v=manekineko-v1-20261126',import.meta.url).href,
 kfc:new URL('../assets/textures/brands/kfc.png?v=kfc-v1-20261125',import.meta.url).href,
 smbc:new URL('../assets/textures/brands/smbc.png?v=smbc-v1-20261125',import.meta.url).href,
 au:new URL('../assets/textures/brands/au.png?v=au-v1-20261125',import.meta.url).href,
 misterDonut:new URL('../assets/textures/brands/mister-donut.png?v=mister-donut-v1-20261125',import.meta.url).href,
 mosBurger:new URL('../assets/textures/brands/mos-burger-trimmed.png?v=mos-burger-v1-20261125',import.meta.url).href,
 daikokuya:new URL('../assets/textures/brands/daikokuya.png?v=doutor-daikokuya-v1-20261124',import.meta.url).href,
 doutor:new URL('../assets/textures/brands/doutor.png?v=doutor-padding-v2-20261124',import.meta.url).href,
 welcia:new URL('../assets/textures/brands/welcia.png?v=welcia-png-v1-20261124',import.meta.url).href,
 lawson:new URL('../assets/textures/brands/lawson.png?v=brand-png-20261123',import.meta.url).href,
 rakutenMobile:new URL('../assets/textures/brands/rakuten-mobile.png?v=rakuten-crop-png-v1-20261123',import.meta.url).href,
 yoshinoya:new URL('../assets/textures/brands/yoshinoya.png?v=brand-png-20261123',import.meta.url).href,
 hidakaya:new URL('../assets/textures/brands/hidakaya.png?v=brand-png-20261123',import.meta.url).href,
 tonkatsuTonichi:new URL('../assets/textures/brands/tonkatsu-tonichi.png?v=brand-png-20261123',import.meta.url).href,
 mcdonalds:new URL('../assets/textures/brands/mcdonalds.png',import.meta.url).href,
 daiso:new URL('../assets/textures/brands/daiso.png',import.meta.url).href,
 gusto:new URL('../assets/textures/brands/gusto.png',import.meta.url).href,
 torikizoku:new URL('../assets/textures/brands/torikizoku.png',import.meta.url).href,
 bamiyan:new URL('../assets/textures/brands/bamiyan.png',import.meta.url).href,
 kaikatsu:new URL('../assets/textures/brands/kaikatsu.png',import.meta.url).href,
 isomaru:new URL('../assets/textures/brands/isomaru.png?v=brand-png-20261123',import.meta.url).href,
 hoshino:new URL('../assets/textures/brands/hoshino.png?v=brand-png-20261123',import.meta.url).href
});

 // The map builder is synchronous; decode PNG dimensions before it starts.
 // The registry is shared with both texture renderers, including previews.
 const imageAspectRatios=new Map();
 let metadataPending=null;
 export function getFacadeImageAspectRatio(texture,fallback=1){
  return imageAspectRatios.get(texture)??fallback;
 }
 export function prepareFacadeImageMetadata(){
  if(typeof Image==='undefined')return Promise.resolve(imageAspectRatios.size);
  if(metadataPending)return metadataPending;
  const pending=Object.entries(TEXTURE_URLS).filter(([name])=>!imageAspectRatios.has(name));
  metadataPending=Promise.all(pending.map(async([name,url])=>{
   // The geometry is built synchronously after this preparation. For Commons
   // brands, use the *selected* remote logo ratio rather than the square
   // fallback PNG ratio, so wide wordmarks fill the entrance fascia.
   const fallback=()=>new Promise(resolve=>{
    const image=new Image();
    const timer=setTimeout(()=>{image.onload=null;image.onerror=null;resolve();},8000);
    image.onload=()=>{
     clearTimeout(timer);
     const w=image.naturalWidth,h=image.naturalHeight;
     if(w>0&&h>0)imageAspectRatios.set(name,w/h);
     resolve();
    };
    image.onerror=()=>{clearTimeout(timer);resolve();};
    image.src=url;
   });
   const id=WIKIDATA_BRANDS[name];
   if(id){
    try{
     const remote=await Promise.race([
      loadWikidataLogo(id),
      new Promise((_,reject)=>setTimeout(()=>reject(Error('Commons metadata timeout')),8000))
     ]);
     if(remote.naturalWidth>0&&remote.naturalHeight>0){
      imageAspectRatios.set(name,remote.naturalWidth/remote.naturalHeight);
      return;
     }
    }catch{/* Keep the bundled PNG aspect when Commons is unavailable. */}
   }
   await fallback();
  })).then(()=>imageAspectRatios.size).finally(()=>{metadataPending=null;});
  return metadataPending;
 }

function perspective(fov,aspect,near,far){
 const f=1/Math.tan(fov/2);
 return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
}
function look(eye,target){
 const normal=a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n);};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const z=normal(eye.map((v,i)=>v-target[i]));
 const x=normal(cross([0,1,0],z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,
  -x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1]);
}
function multiply(a,b){
 const out=new Float32Array(16);
 for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)
  out[j*4+i]+=a[k*4+i]*b[j*4+k];
 return out;
}
function compile(gl,type,source){
 const shader=gl.createShader(type);
 gl.shaderSource(shader,source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
  const reason=gl.getShaderInfoLog(shader);gl.deleteShader(shader);
  throw new Error('UV facade shader: '+reason);
 }
 return shader;
}
function programFor(gl){
 const vs=`
 attribute vec3 aPosition;
 attribute vec2 aUV;
 uniform mat4 uViewProjection;
 uniform mat4 uView;
 varying vec2 vUV;
 varying float vFogDepth;
 void main(){
  vUV=aUV;
  gl_Position=uViewProjection*vec4(aPosition,1.0);
  vFogDepth=-(uView*vec4(aPosition,1.0)).z;
 }`;
 const fs=`
 precision mediump float;
 varying vec2 vUV;
 varying float vFogDepth;
 uniform sampler2D uImage;
 uniform vec3 uSolidColor;
 uniform bool uUseImage;
 uniform float uFogStart;
 uniform float uFogEnd;
 void main(){
  vec4 pixel=uUseImage?texture2D(uImage,vUV):vec4(uSolidColor,1.0);
  // An alpha pixel is still an opaque wall, not a hole into the city.
  pixel=vec4(mix(uSolidColor,pixel.rgb,pixel.a),1.0);
  float fog=clamp((vFogDepth-uFogStart)/max(0.001,uFogEnd-uFogStart),0.0,1.0);
  gl_FragColor=vec4(mix(pixel.rgb,vec3(0.75294,0.83922,0.77255),fog),pixel.a);
 }`;
 const vertex=compile(gl,gl.VERTEX_SHADER,vs),fragment=compile(gl,gl.FRAGMENT_SHADER,fs);
 const program=gl.createProgram();
 gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
 gl.deleteShader(vertex);gl.deleteShader(fragment);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
  const reason=gl.getProgramInfoLog(program);gl.deleteProgram(program);
  throw new Error('UV facade link: '+reason);
 }
 return {program,
  position:gl.getAttribLocation(program,'aPosition'),
  uv:gl.getAttribLocation(program,'aUV'),
  viewProjection:gl.getUniformLocation(program,'uViewProjection'),
  view:gl.getUniformLocation(program,'uView'),
  image:gl.getUniformLocation(program,'uImage'),
  solidColor:gl.getUniformLocation(program,'uSolidColor'),
  useImage:gl.getUniformLocation(program,'uUseImage'),
  fogStart:gl.getUniformLocation(program,'uFogStart'),
  fogEnd:gl.getUniformLocation(program,'uFogEnd')};
}
function isFace(face){
 return Object.hasOwn(TEXTURE_URLS,face?.texture)&&Array.isArray(face.positions)&&
  Array.isArray(face.uvs)&&face.positions.length%18===0&&
  face.uvs.length===face.positions.length/3*2&&
  Array.isArray(face.backgroundPositions)&&face.backgroundPositions.length%18===0&&
  face.positions.length+face.backgroundPositions.length>0&&
  Number.isInteger(face.backgroundColor)&&face.backgroundColor>=0&&face.backgroundColor<=0xffffff;
}
// Match the actual uniform area of each brand image, rather than its old
// approximate fallback color. A solid RGB material is used in either case.
// Sample the four outermost corners. Require a majority of matching opaque
// colors; otherwise retain the configured fallback. Explicit legacy sample
// positions remain supported.
export function chooseFacadeCornerColor(pixels,fallback){
 const counts=new Map();
 for(const p of pixels){
  if(p[3]!==255)continue;
  const color=(p[0]<<16)|(p[1]<<8)|p[2];
  counts.set(color,(counts.get(color)||0)+1);
 }
 for(const [color,count] of counts)if(count>=3)return color;
 return fallback;
}
// Find the most common opaque color family along the actual PNG perimeter.
 // Return an actual sampled RGB, not the bucket's approximated color.
 export function chooseFacadeEdgeColor(pixels,fallback){
  const groups=new Map();
  for(const p of pixels){
   if(p[3]!==255)continue;
   const key=(p[0]>>4)*256+(p[1]>>4)*16+(p[2]>>4);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(p);
  }
  const group=[...groups.values()].sort((a,b)=>b.length-a.length)[0];
  if(!group?.length)return fallback;
  const mean=[0,1,2].map(i=>group.reduce((sum,p)=>sum+p[i],0)/group.length);
  const distance=p=>mean.reduce((sum,m,i)=>sum+(p[i]-m)**2,0);
  const p=group.reduce((best,p)=>distance(p)<distance(best)?p:best);
  return (p[0]<<16)|(p[1]<<8)|p[2];
 }
 function sampledColor(face,resource){
 // A successfully fetched Commons logo defines its own facade background.
 // Never use the bundled PNG's legacy blue when the remote logo has white corners.
 if(resource.dynamicReady&&resource.commonsCornerColor!==null&&resource.commonsCornerColor!==undefined)return resource.commonsCornerColor;
 if(!resource.ready||face.backgroundSample==='fixed')return face.backgroundColor;
 const [u,v]=face.backgroundUV||[.04,.04];
 const legacy=u!==.04||v!==.04;
 const edge=face.backgroundSample==='edge';
 const key=edge?'edge:'+face.backgroundColor:legacy?u+','+v:'corners:'+face.backgroundColor;
 if(resource.colors.has(key))return resource.colors.get(key)??face.backgroundColor;
 let color=null;
 try{
  const image=resource.image,w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(ctx&&w>0&&h>0){
   const read=(x,y)=>{
    ctx.clearRect(0,0,1,1);
    ctx.drawImage(image,x,y,1,1,0,0,1,1);
    return ctx.getImageData(0,0,1,1).data;
   };
   if(edge){
    const pixels=[];
    for(let i=0;i<12;i++){
     const x=Math.round((w-1)*i/11),y=Math.round((h-1)*i/11);
     pixels.push(read(x,0),read(x,h-1),read(0,y),read(w-1,y));
    }
    color=chooseFacadeEdgeColor(pixels,face.backgroundColor);
   }else if(legacy){
    const p=read(Math.min(w-1,Math.max(0,Math.floor(u*w))),Math.min(h-1,Math.max(0,Math.floor((1-v)*h))));
    if(p[3]===255)color=(p[0]<<16)|(p[1]<<8)|p[2];
   }else{
    color=chooseFacadeCornerColor([read(0,0),read(w-1,0),read(0,h-1),read(w-1,h-1)],face.backgroundColor);
   }
  }
 }catch{/* Keep the configured solid fallback when pixel access fails. */}
 resource.colors.set(key,color);
 return color??face.backgroundColor;
}
// One layer per canvas / active Engine renderer; no modifications to pinned Engine.
export function createMapFacadeTextureLayer(renderer){
 const isThree=Boolean(renderer?.THREE);
 const THREE=renderer?.THREE;
 const gl=renderer?.gl;
 if(!isThree&&!gl)throw new Error('Map facade needs a ready A or B renderer');
 let disposed=false;
 const cache=new Map(),resources=new Map(),solidMaterials=new Map();
 let scene=null,shader=null;
 if(isThree){
  scene=new THREE.Scene();
  scene.fog=renderer.scene?.fog??null;
 }else shader=programFor(gl);
 // Every brand owns its texture; all geometry and camera operations remain
 // identical across the fixed WebGL1/Three.js rendering backends.
 for(const [name,url] of Object.entries(TEXTURE_URLS)){
  const resource={name,url,ready:false,failed:false,image:new Image(),texture:null,material:null,colors:new Map()};
  if(isThree){
   const texture=new THREE.Texture();
   texture.colorSpace=THREE.SRGBColorSpace;
   texture.magFilter=THREE.LinearFilter;
   texture.minFilter=THREE.LinearFilter;
   texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
   resource.texture=texture;
   resource.material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,
    transparent:false,depthTest:true,depthWrite:true,toneMapped:false});
   resource.inlayBackground=new THREE.Color(0xffffff);
   resource.material.onBeforeCompile=shader=>{
    shader.uniforms.uInlayBackground={value:resource.inlayBackground};
    shader.fragmentShader='uniform vec3 uInlayBackground;\n'+shader.fragmentShader.replace(
     '#include <map_fragment>',
     '#include <map_fragment>\n diffuseColor.rgb=mix(uInlayBackground,diffuseColor.rgb,diffuseColor.a);\n diffuseColor.a=1.0;');
   };
  }else{
   resource.texture=gl.createTexture();
   if(!resource.texture)throw new Error('UV facade texture allocation failed: '+name);
   // Complete texture even before the image arrives (WebGL1 sampler validation).
   gl.bindTexture(gl.TEXTURE_2D,resource.texture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  }
  const image=resource.image;
  image.decoding='async';
  const upload=source=>{
   if(disposed)return false;
   try{
    if(isThree){
     resource.texture.image=source;
     resource.texture.needsUpdate=true;
    }else{
     gl.activeTexture(gl.TEXTURE0);
     gl.bindTexture(gl.TEXTURE_2D,resource.texture);
     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
     try{
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
     }finally{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);}
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
     // The store logos are NPOT-compatible in WebGL1: no mipmaps, CLAMP_TO_EDGE.
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    }
    resource.image=source;resource.colors.clear();resource.ready=true;
    return true;
   }catch(error){resource.failed=true;console.warn('PNG facade upload failed:',name,error);return false;}
  };
  image.onload=()=>{if(!resource.dynamicReady)upload(image);};
  // Sample the original Commons image, before fitting it into the PNG-sized canvas.
  // Four fully transparent corners mean a white sign background for Commons logos.
  // Other ambiguous corners retain the original PNG/facade behavior.
  const commonsCornerColor=remote=>{
   try{
    const w=remote.naturalWidth,h=remote.naturalHeight;
    if(!(w>0&&h>0))return null;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)return null;
    const read=(x,y)=>{
     ctx.clearRect(0,0,1,1);
     ctx.drawImage(remote,x,y,1,1,0,0,1,1);
     return ctx.getImageData(0,0,1,1).data;
    };
    const pixels=[read(0,0),read(w-1,0),read(0,h-1),read(w-1,h-1)];
    const color=pixels.every(p=>p[3]===0)?0xffffff:chooseFacadeCornerColor(pixels,null);
    if(name==='lawson')reportWikidataLogoStage('Q1557223','corners','success',
     pixels.map(p=>'#'+[...p].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('')+'/a'+p[3]).join(' ')+' => '+(color===null?'判定不可':'#'+color.toString(16).padStart(6,'0')));
    return color;
   }catch(error){
    if(name==='lawson')reportWikidataLogoStage('Q1557223','corners','failed',error?.message||error);
    return null;
   }
  };
  const wikidataId=WIKIDATA_BRANDS[name];
  if(wikidataId)resource.activate=()=>{
   const backend=isThree?'B':'A';
   if(resource.activated)return;
   reportWikidataLogoStage(wikidataId,backend,'loading');
   resource.activated=true;
   loadWikidataLogo(wikidataId).then(remote=>{
    if(disposed){reportWikidataLogoStage(wikidataId,backend,'cancelled');return;}
    // Contain the remote logo in the existing sign rectangle, preserving aspect
    // without rebuilding the map or changing the shared facade wall selection.
    const width=image.naturalWidth||512,height=image.naturalHeight||512;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
    // Fit the visible logo rather than transparent margins. If pixel reading
    // is blocked or the image is fully transparent, retain the original fit.
    let sx=0,sy=0,sw=remote.naturalWidth,sh=remote.naturalHeight;
    let cropStatus='未検出';
    try{
     const probe=document.createElement('canvas');
     probe.width=sw;probe.height=sh;
     const probeCtx=probe.getContext('2d',{willReadFrequently:true});
     if(probeCtx){
      probeCtx.drawImage(remote,0,0);
      const rgba=probeCtx.getImageData(0,0,sw,sh).data;
      let left=sw,top=sh,right=-1,bottom=-1;
      for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
       if(rgba[(y*sw+x)*4+3]<=8)continue;
       if(x<left)left=x;if(x>right)right=x;
       if(y<top)top=y;if(y>bottom)bottom=y;
      }
      if(right>=left&&bottom>=top){
       sx=left;sy=top;sw=right-left+1;sh=bottom-top+1;
       cropStatus='検出成功';
      }else cropStatus='不透明画素なし';
     }
    }catch(error){cropStatus='画素取得失敗: '+(error?.name||'Error');}
    // The UV rectangle already has the Commons aspect when metadata prepared
    // successfully. Fill the square texture in that case: UV geometry restores
    // the original proportions. Otherwise preserve the old contain fallback.
    const remoteAspect=remote.naturalWidth/remote.naturalHeight;
    const geometryMatchesCommons=Math.abs((imageAspectRatios.get(name)||0)/remoteAspect-1)<.01;
    const scale=Math.min(width/sw,height/sh);
    const w=geometryMatchesCommons?width:sw*scale;
    const h=geometryMatchesCommons?height:sh*scale;
    if(name==='lawson')reportWikidataLogoStage(wikidataId,'size','success',
     '元画像 '+remote.naturalWidth+'×'+remote.naturalHeight+'px / '+cropStatus+
     ' / 切抜 '+sw+'×'+sh+'px (x='+sx+', y='+sy+')'+
     ' / 配置 '+w.toFixed(1)+'×'+h.toFixed(1)+'px / キャンバス '+width+'×'+height+'px'+
     ' / UV比率 '+(imageAspectRatios.get(name)||0).toFixed(2)+' / '+(geometryMatchesCommons?'全面配置':'従来配置'));
    ctx.drawImage(remote,sx,sy,sw,sh,(width-w)/2,(height-h)/2,w,h);
    if(upload(canvas)){
     resource.commonsCornerColor=commonsCornerColor(remote);
     resource.dynamicReady=true;
     if(name==='lawson')reportWikidataLogoStage(wikidataId,'background','success',
      'Commons背景：'+(resource.commonsCornerColor===null?'判定不可（従来色）':'#'+resource.commonsCornerColor.toString(16).padStart(6,'0')));
     reportWikidataLogoStage(wikidataId,backend,'success');
    }
    else throw Error('Texture upload did not complete');
   }).catch(error=>{
    reportWikidataLogoStage(wikidataId,backend,disposed?'cancelled':'failed',error?.message||error);
    console.warn('Wikidata logo fallback:',error);
   });
  };
  image.onerror=()=>{
   if(!disposed){resource.failed=true;console.warn('PNG facade not found:',url);}
  };
  resources.set(name,resource);
  image.src=url;
 }
 function solidMaterial(color){
  if(!solidMaterials.has(color))solidMaterials.set(color,new THREE.MeshBasicMaterial({
   color,side:THREE.DoubleSide,transparent:false,depthTest:true,depthWrite:true,toneMapped:false}));
  return solidMaterials.get(color);
 }
 function geometryPart(positions,uvs,material){
  if(!positions.length)return null;
  if(isThree){
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   if(uvs)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
   const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
   return {mesh,geometry};
  }
  const position=gl.createBuffer(),uv=uvs?gl.createBuffer():null;
  if(!position||(uvs&&!uv))throw new Error('UV facade buffer allocation failed');
  gl.bindBuffer(gl.ARRAY_BUFFER,position);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(positions),gl.STATIC_DRAW);
  if(uv){
   gl.bindBuffer(gl.ARRAY_BUFFER,uv);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uvs),gl.STATIC_DRAW);
  }
  return {position,uv,count:positions.length/3};
 }
 function geometryFor(face){
  if(cache.has(face))return cache.get(face);
  const fallback=isThree?solidMaterial(face.backgroundColor):null;
  const entry={wall:geometryPart(face.backgroundPositions,null,fallback),
   logo:geometryPart(face.positions,face.uvs,fallback)};
  cache.set(face,entry);return entry;
 }
 function forget(face,entry){
  for(const part of [entry.wall,entry.logo]){
   if(!part)continue;
   if(isThree){scene.remove(part.mesh);part.geometry.dispose();}
   else{gl.deleteBuffer(part.position);if(part.uv)gl.deleteBuffer(part.uv);}
  }
  cache.delete(face);
 }
 return {
  get state(){return disposed?'disposed':
   [...resources.values()].some(r=>r.ready)?'ready':
   [...resources.values()].some(r=>r.failed)?'failed':'loading';},
  render(faces,camera){
   if(disposed)return;
   const all=Array.isArray(faces)?faces.filter(isFace):[];
   const current=new Set(all);
   for(const [face,entry] of cache)if(!current.has(face))forget(face,entry);
   const valid=all;
   for(const face of valid){
    const resource=resources.get(face.texture);
    resource?.activate?.();geometryFor(face);
    if(face.texture==='lawson'&&resource&&!resource.faceDiagnosticReported){
     resource.faceDiagnosticReported=true;
     reportWikidataLogoStage('Q1557223','face','success',
      'UV看板あり・従来背景 #'+face.backgroundColor.toString(16).padStart(6,'0')+
      '・backgroundSample='+String(face.backgroundSample||'corners'));
    }
   }
   if(!valid.length)return;
   if(isThree){
    for(const face of valid){
     const entry=cache.get(face),resource=resources.get(face.texture);
     const color=sampledColor(face,resource),solid=solidMaterial(color);
     resource.inlayBackground.setHex(color);
     if(entry.wall)entry.wall.mesh.material=solid;
     if(entry.logo)entry.logo.mesh.material=resource.ready?resource.material:solid;
    }
    const webgl=renderer.renderer;
    const autoClear=webgl.autoClear;
    webgl.autoClear=false;
    try{webgl.render(scene,renderer.camera);}
    finally{webgl.autoClear=autoClear;}
   }else{
    const {eye,target,fovDegrees,near,far}=camera;
    const aspect=gl.drawingBufferWidth/Math.max(1,gl.drawingBufferHeight);
    const view=look(eye,target);
    const vp=multiply(perspective(fovDegrees*Math.PI/180,aspect,near,far),view);
    gl.useProgram(shader.program);
    gl.uniformMatrix4fv(shader.viewProjection,false,vp);
    gl.uniformMatrix4fv(shader.view,false,view);
    gl.uniform1f(shader.fogStart,1000);
    gl.uniform1f(shader.fogEnd,2200);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(shader.image,0);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    for(const face of valid){
     const entry=cache.get(face),resource=resources.get(face.texture),color=sampledColor(face,resource);
     gl.uniform3f(shader.solidColor,(color>>16&255)/255,(color>>8&255)/255,(color&255)/255);
     gl.bindTexture(gl.TEXTURE_2D,resource.texture);
     for(const [part,image] of [[entry.wall,false],[entry.logo,resource.ready]]){
      if(!part)continue;
      gl.uniform1i(shader.useImage,image?1:0);
      gl.bindBuffer(gl.ARRAY_BUFFER,part.position);
      gl.enableVertexAttribArray(shader.position);
      gl.vertexAttribPointer(shader.position,3,gl.FLOAT,false,0,0);
      if(part.uv){
       gl.bindBuffer(gl.ARRAY_BUFFER,part.uv);
       gl.enableVertexAttribArray(shader.uv);
       gl.vertexAttribPointer(shader.uv,2,gl.FLOAT,false,0,0);
      }else{
       gl.disableVertexAttribArray(shader.uv);gl.vertexAttrib2f(shader.uv,0,0);
      }
      gl.drawArrays(gl.TRIANGLES,0,part.count);
     }
    }
   }
  },
  dispose(){
   if(disposed)return;
   disposed=true;
   for(const res of resources.values()){
    res.image.onload=null;res.image.onerror=null;
   }
   for(const [face,entry] of cache)forget(face,entry);
   for(const res of resources.values()){
    if(isThree){res.material.dispose();res.texture.dispose();}
    else gl.deleteTexture(res.texture);
   }
   resources.clear();
   for(const material of solidMaterials.values())material.dispose();
   solidMaterials.clear();
   if(!isThree)gl.deleteProgram(shader.program);
  }
 };
}
