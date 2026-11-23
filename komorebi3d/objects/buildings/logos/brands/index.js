// Logo registry: brand identity is independent of any OSM amenity/shop category.
// Existing facade painters and brand definitions remain stable during migration.
import {mcdonalds} from '../../food/mcdonalds.js?v=mcdonalds-poi-level-v2-20261122';
import {daiso} from '../../variety/daiso.js?v=daiso-image-brand-20261122';
import {kaikatsu} from '../../leisure/kaikatsu.js?v=kaikatsu-name-v1-20261122';
import {gusto} from '../../food/gusto.js?v=food-gusto-v1-20261122';
import {bamiyan} from '../../food/bamiyan.js?v=food-bamiyan-v1-20261122';
import {isomaru} from '../../food/isomaru.js?v=isomaru-wide-v1-20261122';
import {torikizoku} from '../../food/torikizoku.js?v=food-torikizoku-v1-20261122';
import {hoshino} from './hoshino.js?v=hoshino-coffee-logo-v1-20261123';
import {lawson} from './lawson.js?v=lawson-image-v1-20261123';
import {rakutenMobile} from './rakuten-mobile.js?v=rakuten-mobile-v1-20261123';
import {yoshinoya} from '../../food/yoshinoya.js?v=food-image-logo-v1-20261123';
import {hidakaya} from '../../food/hidakaya.js?v=food-image-logo-v1-20261123';
import {tonkatsuTonichi} from './tonkatsu-tonichi.js?v=tonkatsu-tonichi-v1-20261123';
import {paintMcDonaldsFacade} from '../../food/mcdonalds-sign.js?v=fascia-seams-v1-20261123';
import {paintDaisoFacade} from '../../variety/daiso-sign.js?v=fascia-seams-v1-20261123';
import {paintKaikatsuFacade} from '../../leisure/kaikatsu-sign.js?v=fascia-seams-v1-20261123';
import {paintGustoFacade} from '../../food/gusto-sign.js?v=fascia-seams-v1-20261123';
import {paintBamiyanFacade} from '../../food/bamiyan-sign.js?v=fascia-seams-v1-20261123';
import {paintIsomaruFacade} from '../../food/isomaru-sign.js?v=fascia-seams-v1-20261123';
import {paintTorikizokuFacade} from '../../food/torikizoku-sign.js?v=fascia-seams-v1-20261123';
import {paintHoshinoFacade} from './hoshino-sign.js?v=fascia-seams-v1-20261123';
import {paintLawsonFacade} from './lawson-sign.js?v=fascia-seams-v1-20261123';
import {paintRakutenMobileFacade} from './rakuten-mobile-sign.js?v=fascia-seams-v1-20261123';
import {paintYoshinoyaFacade} from '../../food/yoshinoya-sign.js?v=yoshinoya-orange-uv-v1-20261123';
import {paintHidakayaFacade} from '../../food/hidakaya-sign.js?v=fascia-seams-v1-20261123';
import {paintTonkatsuTonichiFacade} from './tonkatsu-tonichi-sign.js?v=fascia-seams-v1-20261123';
export const LOGO_BRANDS=Object.freeze([
 {brand:mcdonalds,paint:paintMcDonaldsFacade},
 {brand:daiso,paint:paintDaisoFacade},
 {brand:kaikatsu,paint:paintKaikatsuFacade},
 {brand:gusto,paint:paintGustoFacade},
 {brand:bamiyan,paint:paintBamiyanFacade},
 {brand:isomaru,paint:paintIsomaruFacade},
 {brand:torikizoku,paint:paintTorikizokuFacade},
 {brand:hoshino,paint:paintHoshinoFacade},
 {brand:lawson,paint:paintLawsonFacade},
 {brand:rakutenMobile,paint:paintRakutenMobileFacade},
 {brand:yoshinoya,paint:paintYoshinoyaFacade},
 {brand:hidakaya,paint:paintHidakayaFacade},
 {brand:tonkatsuTonichi,paint:paintTonkatsuTonichiFacade}
]);
