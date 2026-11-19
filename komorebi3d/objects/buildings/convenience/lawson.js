// Lawson storefront: blue fascia, white lettering and a simplified milk-can emblem.
// Sign, facade geometry and automatic entrance are assembled by convenience/common.js.
const blue=0x0868b7,deepBlue=0x07559b,white=0xffffff;
const glyphs={
 L:['100','100','100','100','111'],
 A:['010','101','111','101','101'],
 W:['101','101','111','111','101'],
 S:['111','100','111','001','111'],
 O:['111','101','101','101','111'],
 N:['101','111','111','111','101']
};
const logoQuads=[
 // White milk-can silhouette above the LAWSON wordmark.
 [[.33,.82],[.67,.82],[.67,.92],[.33,.92],white],
 [[.27,.69],[.73,.69],[.69,.83],[.31,.83],white],
 [[.30,.55],[.70,.55],[.73,.70],[.27,.70],white],
 [[.35,.57],[.65,.57],[.65,.72],[.35,.72],blue],
 [[.44,.76],[.56,.76],[.56,.86],[.44,.86],blue],
 [[.39,.89],[.61,.89],[.61,.94],[.39,.94],white]
];
export const lawson={
 id:'lawson',
 names:['ローソン','lawson'],
 sign:{
  background:white,
  bands:[
   {from:.08,to:.90,color:blue},
   {from:.90,to:.97,color:white}
  ],
  textColor:white,label:'LAWSON',glyphs,
  logo:{background:deepBlue,aspect:1.30,wordmark:true,quads:logoQuads}
 },
 stripes:[
  {height:0.60,color:blue},
  {height:0.40,color:white}
 ]
};
