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
        el.textContent = t[key];
      }
    }
  });
  var flagEl = document.getElementById("langFlag");
  if (flagEl) flagEl.textContent = _langFlags[lang] || "\u{1F1EC}\u{1F1E7}";
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

document.addEventListener("DOMContentLoaded", initI18n);
