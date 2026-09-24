/**
 * The list of countries offered on the front page.
 *
 * Uganda is the only one with a complete dataset; Mongolia is shown as coming
 * soon so the intended scope is visible.
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
