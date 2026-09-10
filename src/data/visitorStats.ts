export type VisitorCountryStat = {
  countryCode: string;
  countryName: string;
  numericCode: string;
  visits: number;
};

export type VisitorRegionStat = {
  countryCode: string;
  countryName: string;
  regionKey: string;
  regionCode?: string;
  regionName: string;
  cityName?: string;
  cityCount?: number;
  latitude?: number;
  longitude?: number;
  visits: number;
};

export type VisitorSummary = {
  total: number;
  countries: VisitorCountryStat[];
  regions: VisitorRegionStat[];
  cities: VisitorRegionStat[];
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
  IE: { name: "Ireland", numeric: "372" },
  JP: { name: "Japan", numeric: "392" },
  KR: { name: "South Korea", numeric: "410" },
  NL: { name: "Netherlands", numeric: "528" },
  PL: { name: "Poland", numeric: "616" },
  PT: { name: "Portugal", numeric: "620" },
  SG: { name: "Singapore", numeric: "702" },
  US: { name: "United States", numeric: "840" }
};

// API failures must not be represented as fabricated visitor traffic.
export const fallbackVisitorSummary: VisitorSummary = {
  source: "fallback",
  total: 0,
  lastUpdated: "",
  countries: [],
  regions: [],
  cities: []
};
