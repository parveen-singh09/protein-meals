var _currentLang;

function _getCurrentLang() {
  if (!_currentLang) {
    try { _currentLang = localStorage.getItem("lang") || "en"; } catch(e) { _currentLang = "en"; }
  }
  return _currentLang;
}

var _langFlags = {
  en:"\u{1F1EC}\u{1F1E7}",es:"\u{1F1EA}\u{1F1F8}",fr:"\u{1F1EB}\u{1F1F7}",de:"\u{1F1E9}\u{1F1EA}",
  pt:"\u{1F1F5}\u{1F1F9}",it:"\u{1F1EE}\u{1F1F9}",ru:"\u{1F1F7}\u{1F1FA}",ja:"\u{1F1EF}\u{1F1F5}",
  "zh-CN":"\u{1F1E8}\u{1F1F3}",ar:"\u{1F1F8}\u{1F1E6}",hi:"\u{1F1EE}\u{1F1F3}",ko:"\u{1F1F0}\u{1F1F7}",
  tr:"\u{1F1F9}\u{1F1F7}",nl:"\u{1F1F3}\u{1F1F1}",pl:"\u{1F1F5}\u{1F1F1}",sv:"\u{1F1F8}\u{1F1EA}",th:"\u{1F1F9}\u{1F1ED}"
};

var _langNames = {
  en:"English",es:"Español",fr:"Français",de:"Deutsch",pt:"Português",it:"Italiano",ru:"Русский",ja:"日本語",
  "zh-CN":"中文",ar:"العربية",hi:"हिन्दी",ko:"한국어",tr:"Türkçe",nl:"Nederlands",pl:"Polski",sv:"Svenska",th:"ไทย"
};

var _currencyConfigs = {
  en: { rate: 1.0, symbol: "$", position: "before" },
  es: { rate: 0.92, symbol: " €", position: "after" },
  fr: { rate: 0.92, symbol: " €", position: "after" },
  de: { rate: 0.92, symbol: " €", position: "after" },
  pt: { rate: 0.92, symbol: " €", position: "after" },
  it: { rate: 0.92, symbol: " €", position: "after" },
  ru: { rate: 90.0, symbol: " ₽", position: "after" },
  ja: { rate: 155.0, symbol: "¥", position: "before", decimals: 0 },
  "zh-CN": { rate: 7.25, symbol: "¥", position: "before" },
  ar: { rate: 3.75, symbol: " ر.س", position: "after" },
  hi: { rate: 83.5, symbol: "₹", position: "before" },
  ko: { rate: 1380.0, symbol: "₩", position: "before", decimals: 0 },
  tr: { rate: 32.5, symbol: " ₺", position: "after" },
  nl: { rate: 0.92, symbol: " €", position: "after" },
  pl: { rate: 4.0, symbol: " zł", position: "after" },
  sv: { rate: 10.5, symbol: " kr", position: "after" },
  th: { rate: 36.7, symbol: " ฿", position: "after" }
};

window.__applyLanguage = function applyLanguage(lang) {
  _currentLang = lang;
  var allT = window.__translations || {};
  var t = allT[lang] || allT["en"] || {};
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    if (t[key]) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.setAttribute("placeholder", t[key]);
      } else {
        if (key === "hero.title") {
          var titleText = t[key];
          var highlightMap = {
            en: "High Protein",
            es: "Ricos en Proteínas",
            fr: "riches en protéines",
            de: "proteinreiche",
            pt: "ricos em proteínas",
            it: "ad alto contenuto proteico",
            ru: "с высоким содержанием белка",
            ja: "高タンパク",
            "zh-CN": "高蛋白",
            ar: "عالية البروتين",
            hi: "उच्च प्रोटीन",
            ko: "고단백",
            tr: "Yüksek Proteinli",
            nl: "eiwitrijke",
            pl: "wysokobiałkowe",
            sv: "proteinrika",
            th: "โปรตีนสูง"
          };
          var highlight = highlightMap[lang] || "Protein";
          var regex = new RegExp("(" + highlight + ")", "i");
          el.innerHTML = titleText.replace(regex, '<span class="gradient-text">$1</span>');
        } else {
          var val = t[key];
          if (typeof val === "string" && val.indexOf("120") !== -1) {
            val = val.replace("120+", window.__totalFoodsCount || "123").replace("120", window.__totalFoodsCount || "123");
          }
          el.textContent = val;
        }
      }
      if (key.indexOf("food.") === 0) {
        var card = el.closest(".food-card");
        if (card) {
          if (key.indexOf(".name") !== -1) {
            card.setAttribute("data-name", t[key].toLowerCase());
          } else if (key.indexOf(".desc") !== -1) {
            card.setAttribute("data-description", t[key].toLowerCase());
          }
        }
      }
    }
  });
  if (t["hero.title"]) {
    var rawTitle = t["hero.title"].replace(/[\u200e\u200f]/g, ""); // strip control chars if any
    document.title = rawTitle + " - HighProtein Foodz";
  }
  var metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && t["hero.subtitle"]) {
    var subtitleVal = t["hero.subtitle"];
    if (typeof subtitleVal === "string" && subtitleVal.indexOf("120") !== -1) {
      subtitleVal = subtitleVal.replace("120+", window.__totalFoodsCount || "123").replace("120", window.__totalFoodsCount || "123");
    }
    metaDesc.setAttribute("content", subtitleVal);
  }

  document.querySelectorAll("[data-usd-price]").forEach(function (el) {
    var usdPrice = parseFloat(el.getAttribute("data-usd-price"));
    if (!isNaN(usdPrice)) {
      var config = _currencyConfigs[lang] || _currencyConfigs["en"];
      var converted = usdPrice * config.rate;
      var decimals = config.hasOwnProperty("decimals") ? config.decimals : 2;
      var formattedVal = converted.toFixed(decimals);
      
      if (lang === "es" || lang === "fr" || lang === "de" || lang === "it" || lang === "nl" || lang === "pt") {
        formattedVal = formattedVal.replace(".", ",");
      }
      
      if (config.position === "before") {
        el.textContent = config.symbol + formattedVal;
      } else {
        el.textContent = formattedVal + config.symbol;
      }
    }
  });

  var flagEl = document.getElementById("langFlag");
  if (flagEl) flagEl.textContent = _langFlags[lang] || "\u{1F1EC}\u{1F1E7}";
  var labelEl = document.getElementById("langLabel");
  if (labelEl) labelEl.textContent = _langNames[lang] || "English";
  document.documentElement.setAttribute("lang", lang);
  try { localStorage.setItem("lang", lang); } catch(e) {}
  var wrapper = document.getElementById("langSwitcherWrapper");
  if (wrapper) wrapper.classList.remove("open");
};

function initI18n() {
  window.__applyLanguage(_getCurrentLang());
  var switcher = document.getElementById("langSwitcher");
  var wrapper = document.getElementById("langSwitcherWrapper");
  if (switcher && wrapper) {
    switcher.addEventListener("click", function (e) {
      e.stopPropagation();
      wrapper.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (wrapper && !wrapper.contains(e.target)) {
        wrapper.classList.remove("open");
      }
    });
    wrapper.querySelectorAll(".lang-option").forEach(function (opt) {
      opt.addEventListener("click", function () {
        var lang = opt.getAttribute("data-lang");
        if (lang) window.__applyLanguage(lang);
      });
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initI18n);
} else {
  initI18n();
}
