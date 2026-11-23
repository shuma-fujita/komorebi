// Application-owned UV facade renderer for the pinned Komorebi Engine.
// Main city mesh snapshots remain unchanged; these are zero-thickness UV
// surfaces on the building wall, not free-standing sign boards.
const TEXTURE_URLS=Object.freeze({
 lawson:new URL('../assets/textures/brands/lawson.webp',import.meta.url).href,
 mcdonalds:new URL('../assets/textures/brands/mcdonalds.png',import.meta.url).href,
 daiso:new URL('../assets/textures/brands/daiso.png',import.meta.url).href,
 gusto:new URL('../assets/textures/brands/gusto.png',import.meta.url).href,
 torikizoku:new URL('../assets/textures/brands/torikizoku.png',import.meta.url).href,
 bamiyan:new URL('../assets/textures/brands/bamiyan.png',import.meta.url).href,
 kaikatsu:new URL('../assets/textures/brands/kaikatsu.png',import.meta.url).href,
 isomaru:new URL('../assets/textures/brands/isomaru.webp',import.meta.url).href,
 hoshino:new URL('../assets/textures/brands/hoshino.webp',import.meta.url).href
});

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
 uniform float uFogStart;
 uniform float uFogEnd;
 void main(){
  vec4 pixel=texture2D(uImage,vUV);
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
  fogStart:gl.getUniformLocation(program,'uFogStart'),
  fogEnd:gl.getUniformLocation(program,'uFogEnd')};
}
function isFace(face){
 return Object.hasOwn(TEXTURE_URLS,face?.texture)&&Array.isArray(face.positions)&&
  Array.isArray(face.uvs)&&face.positions.length>=18&&
  face.positions.length%9===0&&face.uvs.length===face.positions.length/3*2;
}

// One layer per canvas / active Engine renderer; no modifications to pinned Engine.
export function createMapFacadeTextureLayer(renderer){
 const isThree=Boolean(renderer?.THREE);
 const THREE=renderer?.THREE;
 const gl=renderer?.gl;
 if(!isThree&&!gl)throw new Error('Map facade needs a ready A or B renderer');
 let disposed=false;
 const cache=new Map(),resources=new Map();
 let scene=null,shader=null;
 if(isThree){
  scene=new THREE.Scene();
  scene.fog=renderer.scene?.fog??null;
 }else shader=programFor(gl);
 // Every brand owns its texture; all geometry and camera operations remain
 // identical across the fixed WebGL1/Three.js rendering backends.
 for(const [name,url] of Object.entries(TEXTURE_URLS)){
  const resource={name,url,ready:false,failed:false,image:new Image(),texture:null,material:null};
  if(isThree){
   const texture=new THREE.Texture();
   texture.colorSpace=THREE.SRGBColorSpace;
   texture.magFilter=THREE.LinearFilter;
   texture.minFilter=THREE.LinearFilter;
   texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
   resource.texture=texture;
   resource.material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,
    transparent:false,depthTest:true,depthWrite:true,toneMapped:false});
  }else{
   resource.texture=gl.createTexture();
   if(!resource.texture)throw new Error('UV facade texture allocation failed: '+name);
  }
  const image=resource.image;
  image.decoding='async';
  image.onload=()=>{
   if(disposed)return;
   try{
    if(isThree){
     resource.texture.image=image;
     resource.texture.needsUpdate=true;
    }else{
     gl.activeTexture(gl.TEXTURE0);
     gl.bindTexture(gl.TEXTURE_2D,resource.texture);
     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
     try{
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
     }finally{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);}
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
     // The store logos are NPOT-compatible in WebGL1: no mipmaps, CLAMP_TO_EDGE.
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    }
    resource.ready=true;
   }catch(error){resource.failed=true;console.warn('PNG facade upload failed:',name,error);}
  };
  image.onerror=()=>{
   if(!disposed){resource.failed=true;console.warn('PNG facade not found:',url);}
  };
  resources.set(name,resource);
  image.src=url;
 }
 function geometryFor(face){
  if(cache.has(face))return cache.get(face);
  if(!isFace(face))return null;
  let entry;
  if(isThree){
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(face.positions,3));
   geo.setAttribute('uv',new THREE.Float32BufferAttribute(face.uvs,2));
   const mesh=new THREE.Mesh(geo,resources.get(face.texture).material);
   mesh.frustumCulled=false;scene.add(mesh);
   entry={mesh,geometry:geo};
  }else{
   const position=gl.createBuffer(),uv=gl.createBuffer();
   if(!position||!uv)throw new Error('UV facade buffer allocation failed');
   gl.bindBuffer(gl.ARRAY_BUFFER,position);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(face.positions),gl.STATIC_DRAW);
   gl.bindBuffer(gl.ARRAY_BUFFER,uv);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(face.uvs),gl.STATIC_DRAW);
   entry={position,uv,count:face.positions.length/3};
  }
  cache.set(face,entry);
  return entry;
 }
 function forget(face,entry){
  if(isThree){scene.remove(entry.mesh);entry.geometry.dispose();}
  else{gl.deleteBuffer(entry.position);gl.deleteBuffer(entry.uv);}
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
   const valid=all.filter(face=>resources.get(face.texture)?.ready);
   for(const face of valid)geometryFor(face);
   if(!valid.length)return;
   if(isThree){
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
     const entry=cache.get(face);
     gl.bindTexture(gl.TEXTURE_2D,resources.get(face.texture).texture);
     gl.bindBuffer(gl.ARRAY_BUFFER,entry.position);
     gl.enableVertexAttribArray(shader.position);
     gl.vertexAttribPointer(shader.position,3,gl.FLOAT,false,0,0);
     gl.bindBuffer(gl.ARRAY_BUFFER,entry.uv);
     gl.enableVertexAttribArray(shader.uv);
     gl.vertexAttribPointer(shader.uv,2,gl.FLOAT,false,0,0);
     gl.drawArrays(gl.TRIANGLES,0,entry.count);
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
   if(!isThree)gl.deleteProgram(shader.program);
  }
 };
}
