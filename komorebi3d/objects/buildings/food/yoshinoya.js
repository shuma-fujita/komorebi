// Yoshinoya storefront colors and compact Roman-letter sign artwork.
// Geometry, glazing and doors use the same shared painter as convenience stores.
const orange=0xe97825,white=0xffffff,red=0xc92827;
const glyphs={
 Y:['101','101','010','010','010'],O:['111','101','101','101','111'],
 S:['111','100','111','001','111'],H:['101','101','111','101','101'],
 I:['111','010','010','010','111'],N:['101','111','111','111','101'],
 A:['010','101','111','101','101']
};
export const yoshinoya={
 id:'yoshinoya',
 names:['吉野家','yoshinoya'],
 sign:{background:orange,upper:orange,lower:red,bands:[{from:.12,to:.93,color:orange},{from:.04,to:.12,color:red}],
  textColor:white,label:'YOSHINOYA',glyphs},
 stripes:[{height:.79,color:orange},{height:.08,color:red},{height:.13,color:white}]
};
