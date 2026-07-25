export function getMunicipalityGisCode(municipality) {
  const code = municipality?.gis_municipality_code || municipality?.gis_code;
  return code ? String(code).trim() : null;
}

export function getMunicipalityGisPrefix(municipality) {
  const code = getMunicipalityGisCode(municipality);
  return code && code.length >= 9 ? code.slice(0, 9) : null;
}
