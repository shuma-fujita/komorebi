// URLs for viewing a mapped OSM element on the matching OSM website.
// A copied test element has its own ID; never reuse the production ID there.
const origins={
 production:'https://www.openstreetmap.org',
 test:'https://master.apis.dev.openstreetmap.org'
};

export function osmElementPageUrl(source,productionTarget,testTarget){
 const origin=Object.prototype.hasOwnProperty.call(origins,source)?origins[source]:null;
 const target=source==='production'?productionTarget:source==='test'?testTarget:null;
 const type=target?.type,id=String(target?.id??'');
 if(!origin||!['node','way','relation'].includes(type)||!/^[1-9]\d*$/.test(id))return null;
 return origin+'/'+type+'/'+id;
}
