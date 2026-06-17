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

export const fallbackVisitorSummary: VisitorSummary = {
  source: "fallback",
  total: 1284,
  lastUpdated: "2026-06-12T00:00:00.000Z",
  regions: [
    {
      countryCode: "CN",
      countryName: "China",
      regionKey: "bj",
      regionCode: "BJ",
      regionName: "Beijing",
      cityCount: 1,
      latitude: 39.9,
      longitude: 116.4,
      visits: 186
    },
    {
      countryCode: "US",
      countryName: "United States",
      regionKey: "ca",
      regionCode: "CA",
      regionName: "California",
      cityCount: 3,
      latitude: 37.3,
      longitude: -121.9,
      visits: 142
    },
    {
      countryCode: "SG",
      countryName: "Singapore",
      regionKey: "sg-01",
      regionCode: "01",
      regionName: "Singapore",
      cityCount: 1,
      latitude: 1.3,
      longitude: 103.8,
      visits: 118
    },
    {
      countryCode: "GB",
      countryName: "United Kingdom",
      regionKey: "eng",
      regionCode: "ENG",
      regionName: "England",
      cityCount: 2,
      latitude: 51.5,
      longitude: -0.1,
      visits: 94
    },
    {
      countryCode: "JP",
      countryName: "Japan",
      regionKey: "13",
      regionCode: "13",
      regionName: "Tokyo",
      cityCount: 1,
      latitude: 35.7,
      longitude: 139.7,
      visits: 88
    },
    {
      countryCode: "DE",
      countryName: "Germany",
      regionKey: "be",
      regionCode: "BE",
      regionName: "Berlin",
      cityCount: 1,
      latitude: 52.5,
      longitude: 13.4,
      visits: 75
    }
  ],
  cities: [
    {
      countryCode: "CN",
      countryName: "China",
      regionKey: "bj",
      regionCode: "BJ",
      regionName: "Beijing",
      cityName: "Beijing",
      latitude: 39.9,
      longitude: 116.4,
      visits: 186
    },
    {
      countryCode: "US",
      countryName: "United States",
      regionKey: "ca",
      regionCode: "CA",
      regionName: "California",
      cityName: "San Francisco",
      latitude: 37.8,
      longitude: -122.4,
      visits: 64
    },
    {
      countryCode: "GB",
      countryName: "United Kingdom",
      regionKey: "eng",
      regionCode: "ENG",
      regionName: "England",
      cityName: "London",
      latitude: 51.5,
      longitude: -0.1,
      visits: 52
    }
  ],
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
