import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { normalizeWifiFeatures, normalizeParkWifiRecords, wifiCoverage, WIFI_SOURCE, WIFI_PARKS_SOURCE, WIFI_PARKS_DATASET, type WifiCatalog } from '../src/lib/cdmxWifi';

// Public geospatial data, not imagery: store a normalized official snapshot for reliable app loading.
const path = 'public/data/cdmx-wifi.json';
const previous = JSON.parse(await readFile(path, 'utf8')) as WifiCatalog;
const retrievedAt = new Date().toISOString();
async function getJson(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Official source returned ${response.status}`);
  return response.json();
}
const query = new URLSearchParams({ where: '1=1', outFields: '*', outSR: '4326', f: 'geojson' });
const parksApi = `https://cdmx.opendatasoft.com/api/explore/v2.1/catalog/datasets/${WIFI_PARKS_DATASET}`;
const results = await Promise.allSettled([
  (async () => {
    const data = await getJson(`${WIFI_SOURCE}/query?${query}`);
    if (data.error || data.exceededTransferLimit || !Array.isArray(data.features)) throw new Error('Incomplete Atlas dataset');
    const points = normalizeWifiFeatures(data.features).map(p => ({ ...p, source: WIFI_SOURCE, retrievedAt }));
    if (!points.length) throw new Error('No eligible Atlas points');
    return points;
  })(),
  (async () => {
    const [metadata, data] = await Promise.all([getJson(parksApi), getJson(`${parksApi}/records?limit=100`)]);
    const meta = metadata.metas?.default;
    if (meta?.publisher !== 'Laboratorio@labcd.mx' || !meta.modified || !Array.isArray(data.results) ||
        data.total_count !== data.results.length) throw new Error('Unverified or incomplete parks dataset');
    const points = normalizeParkWifiRecords(data.results, meta.modified, retrievedAt);
    if (!points.length) throw new Error('No eligible parks points');
    return points;
  })(),
]);
const sources = [WIFI_SOURCE, WIFI_PARKS_SOURCE];
const points = results.flatMap((result, index) => {
  if (result.status === 'fulfilled') return result.value;
  console.warn(`Keeping previous records for ${sources[index]}: ${String(result.reason)}`);
  return previous.points.filter(p => (p.source ?? previous.source) === sources[index])
    .map(p => ({ ...p, source: p.source ?? previous.source, retrievedAt: p.retrievedAt ?? previous.retrievedAt }));
});
if (!points.length || results.every(r => r.status === 'rejected')) throw new Error('No source refreshed; existing snapshot unchanged');
await mkdir('public/data', { recursive: true });
await writeFile(path, JSON.stringify({
  source: WIFI_SOURCE,
  retrievedAt,
  coverage: wifiCoverage(points),
  historicalNotice: points.some(p => p.sourceUpdatedAt) ? 'Parques de Iztapalapa y Tlalpan: datos históricos de 2017; disponibilidad no confirmada.' : undefined,
  points,
}));
console.log(`Saved ${points.length} official locations. ${wifiCoverage(points)}`);