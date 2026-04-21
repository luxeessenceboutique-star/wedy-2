import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { fr } from "./locales/fr";
import { en } from "./locales/en";
import { ar } from "./locales/ar";

export const SUPPORTED_LANGS = ["fr", "en", "ar"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        en: { translation: en },
        ar: { translation: ar },
      },
      fallbackLng: "fr",
      supportedLngs: SUPPORTED_LANGS as unknown as string[],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
      },
    });
}

export function applyDirection(lang: string) {
  if (typeof document === "undefined") return;
  const dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
}

if (typeof window !== "undefined") {
  applyDirection(i18n.language || "fr");
  i18n.on("languageChanged", applyDirection);
}

export default i18n;
