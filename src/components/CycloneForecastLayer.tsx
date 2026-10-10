// Cyclone forecast layer — NHC forecast cone, forecast track and points for all active
// basins (Atlantic, East & Central Pacific). Auto-loads on the map, refreshes every 30 min.
import { useEffect } from 'react';
import L from 'leaflet';

const BASE = 'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer';
const REFRESH_MS = 30 * 60 * 1000;

type Kind = 'cone' | 'track' | 'points';

async function loadLayerIds(): Promise<{ id: number; kind: Kind }[]> {
  const res = await fetch(`${BASE}/layers?f=json`);
  if (!res.ok) return [];
  const data = await res.json();
  const out: { id: number; kind: Kind }[] = [];
  for (const l of data?.layers || []) {
    const n: string = l.name || '';
    if (!/^(AT|EP|CP)\d /.test(n)) continue;
    if (n.endsWith('Forecast Cone')) out.push({ id: l.id, kind: 'cone' });
    else if (n.endsWith('Forecast Track')) out.push({ id: l.id, kind: 'track' });
    else if (n.endsWith('Forecast Points')) out.push({ id: l.id, kind: 'points' });
  }
  return out;
}

async function query(id: number) {
  try {
    const r = await fetch(`${BASE}/${id}/query?where=1%3D1&outFields=*&f=geojson`);
    if (!r.ok) return null;
    const j = await r.json();
    return j?.features?.length ? j : null;
  } catch {
    return null;
  }
}

export const CycloneForecastLayer: React.FC<{ map: L.Map | null }> = ({ map }) => {
  useEffect(() => {
    if (!map) return;
    const group = L.layerGroup().addTo(map);
    let cancelled = false;

    const load = async () => {
      const ids = await loadLayerIds();
      const results = await Promise.all(ids.map(async (l) => ({ ...l, data: await query(l.id) })));
      if (cancelled) return;
      group.clearLayers();
      const order: Kind[] = ['cone', 'track', 'points'];
      for (const kind of order) {
        for (const r of results.filter((x) => x.kind === kind && x.data)) {
          if (kind === 'cone') {
            L.geoJSON(r.data, {
              style: { color: '#ffffff', weight: 2, dashArray: '6 4', fillColor: '#ff2d2d', fillOpacity: 0.22 },
              onEachFeature: (f, layer) =>
                layer.bindPopup(`<b>Cono de incertidumbre</b><br>${f.properties?.stormname || ''}<br>Aviso ${f.properties?.advisnum || ''}`),
            }).addTo(group);
          } else if (kind === 'track') {
            L.geoJSON(r.data, { style: { color: '#ffd400', weight: 3 } }).addTo(group);
          } else {
            L.geoJSON(r.data, {
              pointToLayer: (_f, latlng) =>
                L.circleMarker(latlng, { radius: 5, color: '#000', weight: 1, fillColor: '#ffd400', fillOpacity: 1 }),
              onEachFeature: (f, layer) => {
                const p = f.properties || {};
                layer.bindPopup(
                  `<b>${p.stormname || 'Ciclón'}</b><br>Pronóstico: ${p.fldatelbl || p.datelbl || ''}<br>` +
                  `Vientos: ${p.maxwind ?? '?'} kt · ${p.tcdvlp || p.dvlbl || ''}`
                );
              },
            }).addTo(group);
          }
        }
      }
    };

    load().catch(() => {});
    const t = window.setInterval(() => load().catch(() => {}), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
      map.removeLayer(group);
    };
  }, [map]);
  return null;
};

export default CycloneForecastLayer;
