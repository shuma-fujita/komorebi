// Lawson Store 100: green fascia with red "100" mark and white shop lettering.
// Uses the same shared sign/window/door geometry as the other convenience brands.
const green=0x087e55,darkGreen=0x046846,white=0xffffff,red=0xdc3040;
const glyphs={
 S:['111','100','111','001','111'],
 T:['111','010','010','010','010'],
 O:['111','101','101','101','111'],
 R:['110','101','110','101','101'],
 E:['111','100','110','100','111'],
 '1':['010','110','010','010','111'],
 '0':['111','101','101','101','111']
};
const logoQuads=[
 // Red central badge with white 100 motif.
 [[.10,.64],[.90,.64],[.90,.94],[.10,.94],red],
 [[.20,.67],[.80,.67],[.80,.91],[.20,.91],white],
 [[.275,.70],[.315,.70],[.315,.88],[.275,.88],red],
 [[.245,.83],[.315,.83],[.315,.88],[.275,.88],red],
 [[.365,.71],[.485,.71],[.485,.88],[.365,.88],red],
 [[.395,.74],[.455,.74],[.455,.85],[.395,.85],white],
 [[.525,.71],[.645,.71],[.645,.88],[.525,.88],red],
 [[.555,.74],[.615,.74],[.615,.85],[.555,.85],white]
];
export const lawsonStore100={
 id:'lawson-store100',
 names:['ローソンストア100','lawson store 100','lawsonstore100','ローソンストア１００'],
 sign:{
  background:white,
  bands:[
   {from:.10,to:.90,color:green},
   {from:.91,to:.97,color:white}
  ],
  textColor:white,label:'STORE100',glyphs,
  logo:{background:darkGreen,aspect:1.5,wordmark:true,quads:logoQuads}
 }
};
