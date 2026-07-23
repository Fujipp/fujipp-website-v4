import { createI18n, useI18n } from "vue-i18n";
import { watch } from "vue";
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

export function useLocaleText(): (english: string, thai: string) => string {
    const { locale } = useI18n();

    return (english: string, thai: string): string => (
        locale.value === "th" ? thai : english
    );
}

const initialLocale = getInitialLocale();
document.documentElement.lang = initialLocale;

const i18n = createI18n({
    legacy: false,
    locale: initialLocale,
    fallbackLocale: "en",
    messages: {
        en,
        th,
    },
});

watch(i18n.global.locale, (locale) => {
    if (isSupportedLocale(locale)) saveLocale(locale);
}, { flush: "sync" });

export default i18n;
