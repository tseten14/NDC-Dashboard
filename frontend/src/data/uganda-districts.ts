/**
 * Uganda's districts.
 *
 * The district list used by the geography selector and the maps.
 */
export const ugandaDistricts = [
  "Kampala", "Wakiso", "Mukono", "Jinja", "Mbale", "Gulu", "Lira",
  "Soroti", "Arua", "Mbarara", "Kabale", "Fort Portal", "Masaka",
  "Entebbe", "Hoima", "Kasese", "Tororo", "Iganga", "Mityana",
  "Luweero", "Masindi", "Moroto", "Kotido", "Kapchorwa", "Bushenyi",
  "Ntungamo", "Rukungiri", "Kanungu", "Kisoro", "Bundibugyo",
  "Kyenjojo", "Kamwenge", "Kibaale", "Pallisa", "Kumi", "Katakwi",
  "Adjumani", "Moyo", "Nebbi", "Apac", "Pader", "Kitgum",
  "Kalangala", "Rakai", "Sembabule", "Mpigi", "Kayunga", "Busia",
  "Bugiri", "Mayuge", "Sironko", "Bududa", "Manafwa",
] as const;

export type UgandaDistrict = (typeof ugandaDistricts)[number];
