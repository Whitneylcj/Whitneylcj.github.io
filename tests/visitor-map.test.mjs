import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { countryCatalog, normalizeVisitorSummary, visitorColor, visitorColorBands, fallbackVisitorSummary } from "../src/data/visitorStats.ts";

test("Singapore remains mappable without a polygon or regional data", () => {
  const atlas = JSON.parse(readFileSync(new URL("../node_modules/world-atlas/countries-110m.json", import.meta.url)));
  assert.equal(atlas.objects.countries.geometries.some((country) => country.id === "702"), false);
  const result = normalizeVisitorSummary({ total: 35, countries: [{ countryCode: "US", visits: 22 }, { countryCode: "SG", visits: 13 }] });
  assert.equal(result.countries.length, 2);
  assert.deepEqual(result.regions, []);
  for (const country of result.countries) {
    const point = countryCatalog[country.countryCode];
    assert.ok(Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
    assert.ok(visitorColor(country.visits));
  }
  assert.notEqual(visitorColor(22), visitorColor(13));
});

test("formerly unsupported countries and small territories retain their visits", () => {
  assert.equal(Object.keys(countryCatalog).length, 250);
  const result = normalizeVisitorSummary({ countries: ["MY", "ZA", "HK", "MC", "NZ"].map((countryCode) => ({ countryCode, visits: 1 })) });
  assert.equal(result.total, 5);
  assert.equal(result.countries.length, 5);
  for (const country of result.countries) assert.match(country.numericCode, /^\d{3}$/);
  for (const place of Object.values(countryCatalog)) {
    assert.ok(Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180);
  }
});

test("an unfamiliar code stays in country totals without inventing coordinates", () => {
  const result = normalizeVisitorSummary({ countries: [{ country_code: "zz", country_name: "Unmapped location", count: 3 }] });
  assert.equal(result.total, 3);
  assert.deepEqual(result.countries[0], { countryCode: "ZZ", countryName: "Unmapped location", numericCode: "", visits: 3 });
  assert.equal(countryCatalog.ZZ, undefined);
});

test("every positive band matches its legend and zero stays neutral", () => {
  for (const [visits, index] of [[1, 0], [2, 1], [4, 1], [5, 2], [9, 2], [10, 3], [19, 3], [20, 4], [10000, 4]]) {
    assert.equal(visitorColor(visits), visitorColorBands[index].color);
  }
  for (const visits of [0, -1, NaN, Infinity]) assert.equal(visitorColor(visits), undefined);
});

test("empty and unavailable summaries do not produce fictitious traffic", () => {
  assert.deepEqual(normalizeVisitorSummary({}), { ...fallbackVisitorSummary, source: "api" });
  const result = normalizeVisitorSummary({ total: NaN, countries: [{ countryCode: "US", visits: 0 }, { countryCode: "SG", visits: -1 }, { countryCode: "CN", visits: NaN }] });
  assert.equal(result.total, 0);
  assert.deepEqual(result.countries, []);
  assert.equal(fallbackVisitorSummary.source, "fallback");
});

test("missing regional coordinates do not become a false point at zero latitude/longitude", () => {
  const rows = [[null, null], ["", " "], [91, 181], [undefined, undefined], [0, 0], ["1.3", "103.8"]];
  const result = normalizeVisitorSummary({ regions: rows.map(([latitude, longitude], i) => ({ countryCode: "SG", regionName: String(i), visits: 1, latitude, longitude })) });
  for (const region of result.regions.slice(0, 4)) assert.equal(region.latitude, undefined);
  assert.equal(result.regions[4].latitude, 0);
  assert.equal(result.regions[4].longitude, 0);
  assert.equal(result.regions[5].latitude, 1.3);
});
