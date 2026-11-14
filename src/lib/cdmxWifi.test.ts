import { describe, expect, it } from 'vitest';
import { normalizeWifiFeatures } from './cdmxWifi';

const point = (status = 'WIFI GRATUITO_ACTIVO', lat = 19.368977400386882, lng = -99.19453490036528) => ({
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { objectid: 1, name: 'Alberca Semiolimpica "Cristopher Tronco Sánchez"', alcaldia: 'Alcaldía Álvaro Obregón', estatus: status },
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