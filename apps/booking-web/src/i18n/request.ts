import { getRequestConfig } from "next-intl/server";

export const supportedLocales = ["de"] as const;
export const defaultLocale = "de" as const;

export default getRequestConfig(async () => {
  const locale = defaultLocale;
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return {
    locale,
    messages,
    timeZone: "Europe/Zurich",
  };
});
