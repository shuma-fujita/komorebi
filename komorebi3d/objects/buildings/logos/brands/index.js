// Logo registry: brand identity is independent of any OSM amenity/shop category.
// Existing facade painters and brand definitions remain stable during migration.
import {mcdonalds} from '../../food/mcdonalds.js?v=mcdonalds-poi-level-v2-20261122';
import {daiso} from '../../variety/daiso.js?v=daiso-image-brand-20261122';
import {kaikatsu} from '../../leisure/kaikatsu.js?v=kaikatsu-name-v1-20261122';
import {gusto} from '../../food/gusto.js?v=food-gusto-v1-20261122';
import {bamiyan} from '../../food/bamiyan.js?v=food-bamiyan-v1-20261122';
import {isomaru} from '../../food/isomaru.js?v=isomaru-wide-v1-20261122';
import {torikizoku} from '../../food/torikizoku.js?v=food-torikizoku-v1-20261122';
import {paintMcDonaldsFacade} from '../../food/mcdonalds-sign.js?v=brand-uv-orientation-v3-20261122';
import {paintDaisoFacade} from '../../variety/daiso-sign.js?v=brand-uv-orientation-v3-20261122';
import {paintKaikatsuFacade} from '../../leisure/kaikatsu-sign.js?v=kaikatsu-wall-v1-20261122';
import {paintGustoFacade} from '../../food/gusto-sign.js?v=gusto-wall-v1-20261122';
import {paintBamiyanFacade} from '../../food/bamiyan-sign.js?v=bamiyan-wall-v1-20261122';
import {paintIsomaruFacade} from '../../food/isomaru-sign.js?v=isomaru-wide-v1-20261122';
import {paintTorikizokuFacade} from '../../food/torikizoku-sign.js?v=torikizoku-wall-v1-20261122';
export const LOGO_BRANDS=Object.freeze([
 {brand:mcdonalds,paint:paintMcDonaldsFacade},
 {brand:daiso,paint:paintDaisoFacade},
 {brand:kaikatsu,paint:paintKaikatsuFacade},
 {brand:gusto,paint:paintGustoFacade},
 {brand:bamiyan,paint:paintBamiyanFacade},
 {brand:isomaru,paint:paintIsomaruFacade},
 {brand:torikizoku,paint:paintTorikizokuFacade}
]);
