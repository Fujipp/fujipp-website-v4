import { createI18n } from "vue-i18n";
import en from "@/locales/en";
import th from "@/locales/th";

export const supportedLocales = ["en", "th"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

const localeStorageKey = "fujipp-locale";

function isSupportedLocale(locale: string | null): locale is SupportedLocale {
    return supportedLocales.includes(locale as SupportedLocale);
}

function getInitialLocale(): SupportedLocale {
    const savedLocale = localStorage.getItem(localeStorageKey);

    return isSupportedLocale(savedLocale) ? savedLocale : "en";
}

export function saveLocale(locale: SupportedLocale): void {
    localStorage.setItem(localeStorageKey, locale);
    document.documentElement.lang = locale;
}

const initialLocale = getInitialLocale();
document.documentElement.lang = initialLocale;

export default createI18n({
    legacy: false,
    locale: initialLocale,
    fallbackLocale: "en",
    messages: {
        en,
        th,
    },
});
