import { mkdir, writeFile } from 'node:fs/promises';
import { normalizeWifiFeatures, WIFI_SOURCE } from '../src/lib/cdmxWifi';

// Public geospatial data, not imagery: store a normalized official snapshot for reliable app loading.
const query = new URLSearchParams({ where: '1=1', outFields: '*', outSR: '4326', f: 'geojson' });
const response = await fetch(`${WIFI_SOURCE}/query?${query}`, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`Official Wi-Fi source returned ${response.status}`);
const data = await response.json();
if (data.error || data.exceededTransferLimit || !Array.isArray(data.features)) throw new Error('Official Wi-Fi source is incomplete or invalid');
const points = normalizeWifiFeatures(data.features);
if (!points.length) throw new Error('No eligible official Wi-Fi points');
await mkdir('public/data', { recursive: true });
await writeFile('public/data/cdmx-wifi.json', JSON.stringify({
  source: WIFI_SOURCE,
  retrievedAt: new Date().toISOString(),
  coverage: 'Álvaro Obregón; cobertura parcial de CDMX',
  points,
}));
console.log(`Saved ${points.length} official free Wi-Fi locations; ${data.features.length - points.length} records excluded.`);