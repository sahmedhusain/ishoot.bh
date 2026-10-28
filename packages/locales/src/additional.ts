import { commonEn, resolveCommonTranslations, withCommonCopy } from "./common.cjs";
import { isLocale } from "./registry";
import fr from "./fr.json";
import es from "./es.json";
import de from "./de.json";
import pt from "./pt.json";
import it from "./it.json";
import nl from "./nl.json";
import ru from "./ru.json";
import tr from "./tr.json";
import hi from "./hi.json";
import ur from "./ur.json";
import bn from "./bn.json";
import fa from "./fa.json";
import zh from "./zh.json";
import ja from "./ja.json";
import ko from "./ko.json";
import id from "./id.json";
import ms from "./ms.json";
import sw from "./sw.json";
import pl from "./pl.json";
import uk from "./uk.json";
import vi from "./vi.json";
import th from "./th.json";
import fil from "./fil.json";
import el from "./el.json";
import cs from "./cs.json";
import sv from "./sv.json";
import da from "./da.json";
import fi from "./fi.json";
import no from "./no.json";
import he from "./he.json";
import ro from "./ro.json";
import hu from "./hu.json";
import ta from "./ta.json";
import te from "./te.json";
import zhTw from "./zh-tw.json";
import bg from "./bg.json";
import sr from "./sr.json";
import hr from "./hr.json";
import sk from "./sk.json";
import sl from "./sl.json";
import kk from "./kk.json";
import uz from "./uz.json";
import az from "./az.json";
import be from "./be.json";
import lt from "./lt.json";
import lv from "./lv.json";
import et from "./et.json";
import mr from "./mr.json";
import pa from "./pa.json";
import gu from "./gu.json";
import ml from "./ml.json";
import kn from "./kn.json";
import my from "./my.json";
import am from "./am.json";
import ha from "./ha.json";
import yo from "./yo.json";
import ig from "./ig.json";
import ka from "./ka.json";
import hy from "./hy.json";
import af from "./af.json";
import ne from "./ne.json";
import si from "./si.json";
import km from "./km.json";
import mn from "./mn.json";
import enUi from "./ui/en";
import arUi from "./ui/ar";
import { deepMerge } from "./merge";

export const additionalTranslations: Record<string, Record<string, unknown>> = {
  fr,
  es,
  de,
  pt,
  it,
  nl,
  ru,
  tr,
  hi,
  ur,
  bn,
  fa,
  zh,
  ja,
  ko,
  id,
  ms,
  sw,
  pl,
  uk,
  vi,
  th,
  fil,
  el,
  cs,
  sv,
  da,
  fi,
  no,
  he,
  ro,
  hu,
  ta,
  te,
  "zh-tw": zhTw,
  bg,
  sr,
  hr,
  sk,
  sl,
  kk,
  uz,
  az,
  be,
  lt,
  lv,
  et,
  mr,
  pa,
  gu,
  ml,
  kn,
  my,
  am,
  ha,
  yo,
  ig,
  ka,
  hy,
  af,
  ne,
  si,
  km,
  mn,
};

function copyLocale(locale: string) {
  const tag = locale.toLowerCase().replace(/_/g, "-");
  if (isLocale(tag)) return tag;
  const language = tag.split("-")[0];
  return isLocale(language) ? language : "en";
}

const commonCache: Record<string, typeof commonEn> = {};
const uiCache: Record<string, typeof enUi> = {};
export function getCommonTranslations(locale: string): typeof commonEn {
  const code = copyLocale(locale);
  return commonCache[code] ??= resolveCommonTranslations(code, additionalTranslations[code]?.common);
}

export function getUiTranslations(locale: string): typeof enUi {
  const code = copyLocale(locale);
  const common = getCommonTranslations(code);
  return uiCache[code] ??= withCommonCopy({ ...deepMerge(code === "ar" ? arUi : enUi, additionalTranslations[code]?.ui as never), ...common }, "ui", common);
}
