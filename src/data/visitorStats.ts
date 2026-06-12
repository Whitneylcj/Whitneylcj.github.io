export type VisitorCountryStat = {
  countryCode: string;
  countryName: string;
  numericCode: string;
  visits: number;
};

export type VisitorSummary = {
  total: number;
  countries: VisitorCountryStat[];
  lastUpdated: string;
  source: "api" | "fallback";
};

export const countryCatalog: Record<string, { name: string; numeric: string }> = {
  AU: { name: "Australia", numeric: "036" },
  BR: { name: "Brazil", numeric: "076" },
  CA: { name: "Canada", numeric: "124" },
  CN: { name: "China", numeric: "156" },
  DE: { name: "Germany", numeric: "276" },
  FR: { name: "France", numeric: "250" },
  GB: { name: "United Kingdom", numeric: "826" },
  IN: { name: "India", numeric: "356" },
  JP: { name: "Japan", numeric: "392" },
  KR: { name: "South Korea", numeric: "410" },
  NL: { name: "Netherlands", numeric: "528" },
  SG: { name: "Singapore", numeric: "702" },
  US: { name: "United States", numeric: "840" }
};

export const fallbackVisitorSummary: VisitorSummary = {
  source: "fallback",
  total: 1284,
  lastUpdated: "2026-06-12T00:00:00.000Z",
  countries: [
    { countryCode: "CN", countryName: "China", numericCode: "156", visits: 368 },
    { countryCode: "US", countryName: "United States", numericCode: "840", visits: 302 },
    { countryCode: "SG", countryName: "Singapore", numericCode: "702", visits: 118 },
    { countryCode: "GB", countryName: "United Kingdom", numericCode: "826", visits: 94 },
    { countryCode: "JP", countryName: "Japan", numericCode: "392", visits: 88 },
    { countryCode: "DE", countryName: "Germany", numericCode: "276", visits: 75 },
    { countryCode: "CA", countryName: "Canada", numericCode: "124", visits: 62 },
    { countryCode: "AU", countryName: "Australia", numericCode: "036", visits: 51 },
    { countryCode: "FR", countryName: "France", numericCode: "250", visits: 44 },
    { countryCode: "KR", countryName: "South Korea", numericCode: "410", visits: 39 },
    { countryCode: "IN", countryName: "India", numericCode: "356", visits: 31 },
    { countryCode: "BR", countryName: "Brazil", numericCode: "076", visits: 12 }
  ]
};
