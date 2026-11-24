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
import {paintMcDonaldsFacade} from '../../food/mcdonalds-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintDaisoFacade} from '../../variety/daiso-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintKaikatsuFacade} from '../../leisure/kaikatsu-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintGustoFacade} from '../../food/gusto-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintBamiyanFacade} from '../../food/bamiyan-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintIsomaruFacade} from '../../food/isomaru-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintTorikizokuFacade} from '../../food/torikizoku-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintHoshinoFacade} from './hoshino-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintLawsonFacade} from './lawson-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintRakutenMobileFacade} from './rakuten-mobile-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintYoshinoyaFacade} from '../../food/yoshinoya-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintHidakayaFacade} from '../../food/hidakaya-sign.js?v=wall-inlay-step2-v1-20261124';
import {paintTonkatsuTonichiFacade} from './tonkatsu-tonichi-sign.js?v=wall-inlay-step2-v1-20261124';
import {welcia} from './welcia.js?v=welcia-png-v1-20261124';
import {paintWelciaFacade} from './welcia-sign.js?v=welcia-png-v1-20261124';
import {doutor} from './doutor.js?v=doutor-daikokuya-v1-20261124';
import {paintDoutorFacade} from './doutor-sign.js?v=doutor-padding-v2-20261124';
import {daikokuya} from './daikokuya.js?v=doutor-daikokuya-v1-20261124';
import {paintDaikokuyaFacade} from './daikokuya-sign.js?v=doutor-daikokuya-v1-20261124';
import {mosBurger} from './mos-burger.js?v=mos-burger-v1-20261125';
import {paintMosBurgerFacade} from './mos-burger-sign.js?v=mos-burger-v1-20261125';
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
 {brand:tonkatsuTonichi,paint:paintTonkatsuTonichiFacade},
 {brand:doutor,paint:paintDoutorFacade},
 {brand:daikokuya,paint:paintDaikokuyaFacade},
 {brand:welcia,paint:paintWelciaFacade},
 {brand:mosBurger,paint:paintMosBurgerFacade}
]);
