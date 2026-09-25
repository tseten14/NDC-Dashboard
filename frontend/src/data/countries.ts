/**
 * The list of countries offered on the front page.
 *
 * Uganda has a complete dataset; Mongolia is the next planned country.
 */
export type CountryCode = "UG" | "MN";

export type CountryOption = {
  code: CountryCode;
  name: string;
  flag: string;
  available: boolean;
};

/** Countries shown on the entry screen. Only Uganda loads the full cockpit today. */
export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "UG", name: "Uganda", flag: "🇺🇬", available: true },
  { code: "MN", name: "Mongolia", flag: "🇲🇳", available: false },
];

export function getCountryByCode(code: string | null | undefined): CountryOption | undefined {
  return COUNTRY_OPTIONS.find((c) => c.code === code);
}
