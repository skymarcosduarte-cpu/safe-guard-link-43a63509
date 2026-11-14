export const WIFI_SOURCE = 'https://serviciosatlas.sgirpc.cdmx.gob.mx/arcgis/rest/services/AtlasOnline/AOB_Atlas_de_Riesgos/MapServer/63';

export interface WifiPoint {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  borough: string;
  reportedStatus: string;
}

export interface WifiCatalog {
  source: string;
  retrievedAt: string;
  coverage: string;
  points: WifiPoint[];
}

// Only recorded free Wi-Fi sites are eligible; a source fault report is not availability.
export function normalizeWifiFeatures(features: unknown[]): WifiPoint[] {
  const points: WifiPoint[] = [];
  const seen = new Set<number>();
  for (const value of features) {
    if (!value || typeof value !== 'object') continue;
    const feature = value as { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown[] } };
    const p = feature.properties;
    const c = feature.geometry?.coordinates;
    if (!p || feature.geometry?.type !== 'Point' || !c) continue;
    const status = String(p.estatus ?? '').trim();
    if (!['WIFI GRATUITO_ACTIVO', 'AAO wifi libre y gratuito/Wifi Libre'].includes(status)) continue;
    const [lng, lat] = c;
    const id = Number(p.objectid);
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < 19 || lat > 19.7 || lng < -99.4 || lng > -98.9 || !Number.isInteger(id) || seen.has(id)) continue;
    seen.add(id);
    points.push({
      id, lat, lng,
      name: String(p.name ?? '').trim() || `Internet gratuito ${id}`,
      address: [p.direccion, p.esquina, p.colonia].map(v => String(v ?? '').trim()).filter(Boolean).join(', '),
      borough: String(p.alcaldia ?? '').trim(),
      reportedStatus: status,
    });
  }
  return points;
}