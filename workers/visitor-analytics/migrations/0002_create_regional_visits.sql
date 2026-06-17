CREATE TABLE IF NOT EXISTS regional_visits (
  country_code TEXT NOT NULL,
  region_key TEXT NOT NULL,
  region_code TEXT,
  region_name TEXT NOT NULL,
  city_name TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (country_code, region_key, city_name, day)
);

CREATE INDEX IF NOT EXISTS idx_regional_visits_day ON regional_visits(day);
CREATE INDEX IF NOT EXISTS idx_regional_visits_country_day ON regional_visits(country_code, day);
