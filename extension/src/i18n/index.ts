import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import es from "./es.json";
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
if (typeof chrome !== "undefined" && chrome.storage) {
  chrome.storage.local.get("uiLanguage", (result) => {
    void i18n.changeLanguage(String(result.uiLanguage || "en"));
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.uiLanguage)
      void i18n.changeLanguage(String(changes.uiLanguage.newValue));
  });
}
i18n.on("languageChanged", (language) => {
  // Never change the meeting host page's language or direction.
  if (
    location.protocol === "chrome-extension:" ||
    location.hostname === "localhost"
  ) {
    document.documentElement.lang = language;
    document.documentElement.dir = i18n.dir(language);
  }
});
export default i18n;
