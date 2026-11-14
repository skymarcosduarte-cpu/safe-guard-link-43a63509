import { describe, expect, it } from 'vitest';
import { normalizeWifiFeatures, normalizeParkWifiRecords, wifiCoverage, WIFI_PARKS_SOURCE } from './cdmxWifi';

const point = (status = 'WIFI GRATUITO_ACTIVO', lat = 19.368977400386882, lng = -99.19453490036528) => ({
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { objectid: 1, name: 'Alberca Semiolimpica "Cristopher Tronco Sánchez"', alcaldia: 'Alcaldía Álvaro Obregón', estatus: status },
});

describe('Additional official borough data', () => {
  const updatedAt = '2017-06-07T14:48:15+00:00';
  const retrievedAt = '2026-11-14T06:45:00Z';
  const park = (name: string, latitude = '19.382722', longitude = '-99.039077') => ({ name, latitude, longitude });
  it('includes identifiable official parks in Iztapalapa and Tlalpan without claiming current availability', () => {
    const points = normalizeParkWifiRecords([park('PM-PARQUE CULTURAL INFANTIL PATOLLI CBZA. DE JRZ LINA1 AP1'), park('PM-BOSQUE DE TLALPAN LINEA3 AP1', '19.295793', '-99.192102')], updatedAt, retrievedAt);
    expect(points.map(p => p.borough)).toEqual(['Iztapalapa', 'Tlalpan']);
    expect(points[1]).toMatchObject({ lat: 19.295793, lng: -99.192102, source: WIFI_PARKS_SOURCE, sourceUpdatedAt: updatedAt, retrievedAt, reportedStatus: 'Registro histórico; disponibilidad no confirmada' });
  });
  it('rejects the official dataset erroneous -99.909204 longitude without guessing a correction', () => {
    expect(normalizeParkWifiRecords([park('EXPLANADA DELEGACION IZTAPALAPA AP4', '19.359287', '-99.909204')], updatedAt, retrievedAt)).toEqual([]);
  });
  it('deduplicates multiple access points at one park location', () => {
    expect(normalizeParkWifiRecords([park('PATOLLI AP1'), park('PATOLLI AP2')], updatedAt, retrievedAt)).toHaveLength(1);
  });
  it('does not assign every record to Iztapalapa from the dataset slug', () => {
    expect(normalizeParkWifiRecords([park('SITIO DESCONOCIDO')], updatedAt, retrievedAt)).toEqual([]);
  });
  it('reports only boroughs represented by validated points', () => {
    const points = [...normalizeWifiFeatures([point()]), ...normalizeParkWifiRecords([park('PATOLLI'), park('BOSQUE DE TLALPAN', '19.295793', '-99.192102')], updatedAt, retrievedAt)];
    expect(wifiCoverage(points)).toBe('Álvaro Obregón, Iztapalapa, Tlalpan · cobertura parcial de CDMX');
  });
});

describe('Official CDMX free Internet locations', () => {
  it('preserves the actual official site coordinates', () => {
    expect(normalizeWifiFeatures([point()])[0]).toMatchObject({ id: 1, lat: 19.368977400386882, lng: -99.19453490036528 });
  });
  it('accepts the source free Wi-Fi category', () => {
    expect(normalizeWifiFeatures([point('AAO wifi libre y gratuito/Wifi Libre')])).toHaveLength(1);
  });
  it('excludes sites with a reported fault', () => {
    expect(normalizeWifiFeatures([point('REPORTE DE FALLA')])).toEqual([]);
  });
  it('rejects invalid or non-CDMX coordinates', () => {
    expect(normalizeWifiFeatures([point('WIFI GRATUITO_ACTIVO', NaN), point('WIFI GRATUITO_ACTIVO', 0, 0)])).toEqual([]);
  });
  it('does not duplicate a site', () => {
    expect(normalizeWifiFeatures([point(), point()])).toHaveLength(1);
  });
});