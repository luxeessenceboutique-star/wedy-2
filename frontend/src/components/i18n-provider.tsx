import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { applyDirection } from "@/lib/i18n";

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyDirection(i18n.language || "fr");
  }, []);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
