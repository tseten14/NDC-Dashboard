export type CountryCode = "UG" | "KE" | "TZ" | "RW" | "ET" | "GH" | "ZA" | "NG";

export type CountryOption = {
  code: CountryCode;
  name: string;
  flag: string;
  available: boolean;
};

/** Countries shown on the entry screen. Only Uganda loads the full cockpit today. */
export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "UG", name: "Uganda", flag: "🇺🇬", available: true },
  { code: "KE", name: "Kenya", flag: "🇰🇪", available: false },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", available: false },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", available: false },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", available: false },
  { code: "GH", name: "Ghana", flag: "🇬🇭", available: false },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", available: false },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", available: false },
];

export function getCountryByCode(code: string | null | undefined): CountryOption | undefined {
  return COUNTRY_OPTIONS.find((c) => c.code === code);
}
