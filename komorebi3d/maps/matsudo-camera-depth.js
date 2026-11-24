// App-owned projection policy for the Matsudo flight camera.
// No changes to map geometry, camera pose, Engine, or the 2200m far plane.
export const MATSUDO_NEAR_MIN_M=.1;
export const MATSUDO_NEAR_MAX_M=4;
export const MATSUDO_FAR_M=2200;
const LOW_FLIGHT_M=15;
const HIGH_FLIGHT_M=80;
// The current helicopter fits a sphere of radius 2.5m centered at
// [actorX, flightAltitude+1.65, actorZ], for every yaw. Keep a further
// 0.5m clearance in camera-forward depth before the nearest possible vertex.
const HELICOPTER_RADIUS_M=2.5;
const HELICOPTER_CLEARANCE_M=.5;
const HELICOPTER_TARGET_Y=1.65;

export function matsudoCameraNear(pose,flightAltitude){
 const eye=pose?.eye,target=pose?.target;
 if(!Array.isArray(eye)||eye.length!==3||!eye.every(Number.isFinite)||
    !Array.isArray(target)||target.length!==3||!target.every(Number.isFinite)||
    !Number.isFinite(flightAltitude))return MATSUDO_NEAR_MIN_M;
 // The orbit camera can be lower than the actor when looking upward.
 // Preserve the original near plane at low altitude or low camera height.
 const height=Math.min(eye[1],flightAltitude);
 if(height<=LOW_FLIGHT_M)return MATSUDO_NEAR_MIN_M;
 const t=Math.min(1,(height-LOW_FLIGHT_M)/(HIGH_FLIGHT_M-LOW_FLIGHT_M));
 const desired=MATSUDO_NEAR_MIN_M+(MATSUDO_NEAR_MAX_M-MATSUDO_NEAR_MIN_M)*t;
 const dx=target[0]-eye[0],dy=target[1]-eye[1],dz=target[2]-eye[2];
 const distance=Math.hypot(dx,dy,dz);
 if(!(distance>0))return MATSUDO_NEAR_MIN_M;
 // The rig smooths targetY independently of the actual flight altitude.
 // Bound against the real actor center, not the smoothed target alone.
 const actorDepth=distance+(flightAltitude+HELICOPTER_TARGET_Y-target[1])*dy/distance;
 const safeNear=actorDepth-HELICOPTER_RADIUS_M-HELICOPTER_CLEARANCE_M;
 return Math.max(MATSUDO_NEAR_MIN_M,Math.min(desired,safeNear));
}
