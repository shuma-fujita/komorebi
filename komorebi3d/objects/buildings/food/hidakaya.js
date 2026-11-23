// Hidakaya storefront: white sign face with a vivid red name band.
const red=0xc9232c,white=0xffffff,yellow=0xf5bf38;
const glyphs={
 H:['101','101','111','101','101'],I:['111','010','010','010','111'],
 D:['110','101','101','101','110'],A:['010','101','111','101','101'],
 K:['101','101','110','101','101'],Y:['101','101','010','010','010']
};
export const hidakaya={
 id:'hidakaya',
 names:['日高屋','hidakaya','熱烈中華食堂日高屋'],
 sign:{background:white,upper:red,lower:yellow,bands:[{from:.13,to:.90,color:red},{from:.04,to:.13,color:yellow}],
  textColor:white,label:'HIDAKAYA',glyphs}
};
