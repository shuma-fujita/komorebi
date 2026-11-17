/**
 * Shared mesh-renderer settings contract (Step 1).
 *
 * Settings are validated and retained but NOT applied to rendering yet.
 * Omitting settings preserves the exact legacy A/B render behavior.
 * Camera near/far/fov in a MeshRenderSnapshot remain authoritative.
 */
const GROUPS = Object.freeze({
  camera: ["fovDegrees","near","far"],
  fog: ["enabled","mode","color","density","start","end"],
  background: ["color"],
  lighting: ["ambientIntensity","directionalIntensity","direction"],
  colorProcessing: ["outputColorSpace","toneMapping"],
  resolution: ["maxPixelRatio"]
});
const modes = new Set(["linear","exp2"]);
const spaces = new Set(["srgb","linear"]);
const mappings = new Set(["none"]);
const isPlainObject = value => value !== null && typeof value === "object" &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const finite = value => typeof value === "number" && Number.isFinite(value);
const positive = value => finite(value) && value > 0;
const color = value => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
const check = (valid,path) => { if(!valid)throw new TypeError("Invalid render setting: "+path); };

export function createRenderSettings(input) {
  check(isPlainObject(input),"settings");
  for(const name of Object.keys(input))check(Object.hasOwn(GROUPS,name),name);
  const settings={};
  for(const [group,fields] of Object.entries(GROUPS)){
    if(!Object.hasOwn(input,group))continue;
    const source=input[group];
    check(isPlainObject(source),group);
    for(const key of Object.keys(source))check(fields.includes(key),group+"."+key);
    const value={};
    for(const key of Object.keys(source)){
      const v=source[key],path=group+"."+key;
      if(key==="fovDegrees")check(positive(v)&&v<180,path);
      else if(key==="near"||key==="far"||key==="maxPixelRatio")check(positive(v),path);
      else if(key==="density"||key==="start"||key==="end"||key==="ambientIntensity"||key==="directionalIntensity")check(finite(v)&&v>=0,path);
      else if(key==="enabled")check(typeof v==="boolean",path);
      else if(key==="mode")check(modes.has(v),path);
      else if(key==="color")check(color(v),path);
      else if(key==="outputColorSpace")check(spaces.has(v),path);
      else if(key==="toneMapping")check(mappings.has(v),path);
      else if(key==="direction")check(Array.isArray(v)&&v.length===3&&v.every(finite),path);
      value[key]=Array.isArray(v)?Object.freeze([...v]):v;
    }
    if(group==="camera"&&value.near!==undefined&&value.far!==undefined)
      check(value.far>value.near,"camera.far");
    if(group==="fog"&&value.start!==undefined&&value.end!==undefined)
      check(value.end>value.start,"fog.end");
    settings[group]=Object.freeze(value);
  }
  return Object.freeze(settings);
}
