import test from 'node:test';
import assert from 'node:assert/strict';

import { getMunicipalityGisCode, getMunicipalityGisPrefix } from './gisCode.js';

test('uses stored municipality GIS code without Borongan fallback', () => {
  assert.equal(getMunicipalityGisCode({ gis_municipality_code: null, gis_code: 'PH0802605' }), 'PH0802605');
  assert.equal(getMunicipalityGisCode({ gis_municipality_code: null, gis_code: null }), null);
});

test('derives barangay GIS prefix only when a GIS code exists', () => {
  assert.equal(getMunicipalityGisPrefix({ gis_municipality_code: 'PH0802604001' }), 'PH0802604');
  assert.equal(getMunicipalityGisPrefix({ gis_municipality_code: null, gis_code: null }), null);
});
