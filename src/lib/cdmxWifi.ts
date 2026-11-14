export const WIFI_SOURCE = 'https://serviciosatlas.sgirpc.cdmx.gob.mx/arcgis/rest/services/AtlasOnline/AOB_Atlas_de_Riesgos/MapServer/63';
export const WIFI_PARKS_DATASET = 'localizaciondepuntosdeaccesowifienparquesyplazaspublicasiztapalapa-gdf_iztapalap';
export const WIFI_PARKS_SOURCE = `https://cdmx.opendatasoft.com/explore/dataset/${WIFI_PARKS_DATASET}/`;
export const WIFI_ADIP_DOCUMENT = 'https://adip.cdmx.gob.mx/storage/app/media/uploaded-files/TC.pdf';

// Indexed text of ADIP's official document; spaces within numeric cells are extraction artifacts.
export function normalizeAdipWifiDocument(text: string, retrievedAt: string): WifiPoint[] {
  const boroughs: Record<string, string> = {
    'BENITO JUÁREZ': 'Benito Juárez', 'COYOACÁN': 'Coyoacán', 'MIGUEL HIDALGO': 'Miguel Hidalgo',
    'CUAUHTÉMOC': 'Cuauhtémoc', 'TLALPAN': 'Tlalpan', 'CUAJIMALPA': 'Cuajimalpa',
    'VENUSTIANO CARRANZA': 'Venustiano Carranza',
  };
  const points: WifiPoint[] = [];
  const seen = new Set<string>();
  for (const line of text.split('\n')) {
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.length !== 5) continue;
    const [district, name, category, latitude, longitude] = cells;
    const borough = boroughs[district];
    // Reject known contradictory place/borough records, private malls and ambiguous office entries.
    if (!borough || !name || !['SITIOS PÚBLICOS', 'HOSPITALES'].includes(category) ||
        /MAGDALENA CON\s*TRERAS|RUFINO MAYO|CENTRO COYOACAN|BUNKER|GLORIETA INSURGENTES/i.test(name)) continue;
    const latText = latitude.replace(/\s/g, '');
    const lngText = longitude.replace(/\s/g, '');
    if (!/^\d+\.\d+$/.test(latText) || !/^-\d+\.\d+$/.test(lngText)) continue;
    const lat = Number(latText), lng = Number(lngText);
    if (lat < 19 || lat > 19.7 || lng < -99.4 || lng > -98.9) continue;
    const key = `${lat},${lng}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({ id: 2000000 + points.length, name, lat, lng, borough, address: '',
      reportedStatus: 'Documento sin fecha; disponibilidad no confirmada',
      source: WIFI_ADIP_DOCUMENT, sourceLabel: 'ADIP CDMX · WiFi Móvil CDMX–Telmex', retrievedAt });
  }
  return points;
}

export function mergeWifiPoints(groups: WifiPoint[][]): WifiPoint[] {
  const seen = new Set<string>();
  return groups.flat().filter(point => {
    const key = `${point.lat},${point.lng}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface WifiPoint {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  borough: string;
  reportedStatus: string;
  source?: string;
  sourceLabel?: string;
  sourceUpdatedAt?: string;
  retrievedAt?: string;
}

export interface WifiCatalog {
  source: string;
  retrievedAt: string;
  coverage: string;
  points: WifiPoint[];
  historicalNotice?: string;
}

// This official legacy dataset has no current status; retain its date and never imply live availability.
export function normalizeParkWifiRecords(records: unknown[], updatedAt: string, retrievedAt: string): WifiPoint[] {
  const points: WifiPoint[] = [];
  const seen = new Set<string>();
  for (const value of records) {
    if (!value || typeof value !== 'object') continue;
    const record = value as Record<string, unknown>;
    const name = String(record.name ?? '').trim();
    const lat = Number(record.latitude);
    const lng = Number(record.longitude);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < 19 || lat > 19.7 || lng < -99.4 || lng > -98.9) continue;
    // Borough is inferred only for identifiable parks, not from the dataset's misleading Iztapalapa slug.
    const borough = /BOSQUE DE TLALPAN/i.test(name) ? 'Tlalpan'
      : /PATOLLI|TEOTONGO|PACANA|PAELSA/i.test(name) ? 'Iztapalapa' : '';
    if (!borough) continue;
    const key = `${lat},${lng}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({
      id: 1000000 + points.length, name, lat, lng, address: '', borough,
      reportedStatus: 'Registro histórico; disponibilidad no confirmada',
      source: WIFI_PARKS_SOURCE, sourceLabel: 'Datos abiertos CDMX · Laboratorio para la Ciudad',
      sourceUpdatedAt: updatedAt, retrievedAt,
    });
  }
  return points;
}

export function wifiCoverage(points: WifiPoint[]): string {
  const boroughs = [...new Set(points.map(p => p.borough.replace(/^Alcald[ií]a\s+/i, '').trim()).filter(Boolean))];
  return `${boroughs.sort((a, b) => a.localeCompare(b, 'es')).join(', ')} · cobertura parcial de CDMX`;
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