import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import de from "./de.json";
import pt from "./pt.json";
import it from "./it.json";
import ru from "./ru.json";
import ja from "./ja.json";
import zhCN from "./zh-CN.json";
import ar from "./ar.json";
import hi from "./hi.json";
import ko from "./ko.json";
import tr from "./tr.json";
import nl from "./nl.json";
import pl from "./pl.json";
import sv from "./sv.json";
import th from "./th.json";

export const translations = {
  en, es, fr, de, pt, it, ru, ja,
  "zh-CN": zhCN, ar, hi, ko, tr, nl, pl, sv, th
};

export const languages = [
  { code: "en", label: "EN", name: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "es", label: "ES", name: "Espa\u00f1ol", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "fr", label: "FR", name: "Fran\u00e7ais", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "de", label: "DE", name: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "pt", label: "PT", name: "Portugu\u00eas", flag: "\u{1F1F5}\u{1F1F9}" },
  { code: "it", label: "IT", name: "Italiano", flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "ru", label: "RU", name: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "ja", label: "JA", name: "\u65e5\u672c\u8a9e", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "zh-CN", label: "ZH", name: "\u4e2d\u6587", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "ar", label: "AR", name: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", flag: "\u{1F1F8}\u{1F1E6}" },
  { code: "hi", label: "HI", name: "\u0939\u093f\u0928\u094d\u0926\u0940", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "ko", label: "KO", name: "\ud55c\uad6d\uc5b4", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "tr", label: "TR", name: "T\u00fcrk\u00e7e", flag: "\u{1F1F9}\u{1F1F7}" },
  { code: "nl", label: "NL", name: "Nederlands", flag: "\u{1F1F3}\u{1F1F1}" },
  { code: "pl", label: "PL", name: "Polski", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "sv", label: "SV", name: "Svenska", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "th", label: "TH", name: "\u0e44\u0e17\u0e22", flag: "\u{1F1F9}\u{1F1ED}" },
];

export function getTranslations(lang) {
  return translations[lang] || translations.en;
}
