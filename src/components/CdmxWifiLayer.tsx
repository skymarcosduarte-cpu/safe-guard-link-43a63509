import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { WifiCatalog } from '@/lib/cdmxWifi';

export interface WifiLayerStatus {
  loading: boolean;
  count: number;
  error: string | null;
  retrievedAt?: string;
}

interface Props {
  map: L.Map | null;
  enabled: boolean;
  onStatus: (status: WifiLayerStatus) => void;
}

let cachedCatalog: WifiCatalog | null = null;

export function CdmxWifiLayer({ map, enabled, onStatus }: Props) {
  const catalogRef = useRef<WifiCatalog | null>(cachedCatalog);

  useEffect(() => {
    if (!map || !enabled) return;
    const controller = new AbortController();
    let disposed = false;
    let group: L.LayerGroup | null = null;
    let renderer: L.Canvas | null = null;
    let redraw: (() => void) | null = null;
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    async function showSites() {
      onStatus({ loading: true, count: 0, error: null });
      try {
        let catalog = catalogRef.current;
        if (!catalog) {
          const response = await fetch('/data/cdmx-wifi.json', { signal: controller.signal });
          if (!response.ok) throw new Error('No se pudo cargar el catálogo de Internet gratuito.');
          catalog = await response.json() as WifiCatalog;
          if (!catalog.points?.length || !catalog.retrievedAt) throw new Error('Catálogo de Internet no disponible.');
          catalogRef.current = catalog;
          cachedCatalog = catalog;
        }
        if (disposed || !map) return;
        const points = catalog.points;
        const date = new Date(catalog.retrievedAt).toLocaleDateString('es-MX');
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number]));
        if (!map.getBounds().intersects(bounds)) map.fitBounds(bounds, { padding: [45, 90], maxZoom: 14 });
        group = L.layerGroup().addTo(map);
        renderer = L.canvas({ padding: 0.3 });
        const markerColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        redraw = () => {
          if (!group || !map || !renderer) return;
          group.clearLayers();
          const visibleBounds = map.getBounds().pad(0.1);
          for (const point of points) {
            if (!visibleBounds.contains([point.lat, point.lng])) continue;
            const popup = document.createElement('div');
            popup.className = 'space-y-2 text-sm';
            const title = document.createElement('strong');
            title.textContent = point.name;
            popup.append(title);
            for (const text of ['Internet gratuito', point.address, point.borough, `Consulta: ${date}`, 'Servicio no verificado en tiempo real.']) {
              if (!text) continue;
              const line = document.createElement('p');
              line.textContent = text;
              popup.append(line);
            }
            const source = document.createElement('a');
            source.href = catalog.source;
            source.target = '_blank';
            source.rel = 'noopener noreferrer';
            source.textContent = 'Fuente: Atlas de Riesgos CDMX';
            popup.append(source);
            const directions = document.createElement('a');
            directions.className = 'block';
            directions.href = `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;
            directions.target = '_blank';
            directions.rel = 'noopener noreferrer';
            directions.textContent = 'Cómo llegar';
            popup.append(directions);
            const tooltip = document.createElement('span');
            tooltip.textContent = `Wi-Fi gratuito · ${point.name}`;
            L.circleMarker([point.lat, point.lng], {
              renderer, radius: 7, color: `hsl(${markerColor})`, fillColor: `hsl(${markerColor})`,
              fillOpacity: 0.85, weight: 2,
            }).bindPopup(popup).bindTooltip(tooltip).addTo(group);
          }
        };
        redraw();
        map.on('moveend', redraw);
        onStatus({ loading: false, count: points.length, error: null, retrievedAt: catalog.retrievedAt });
      } catch (error) {
        if (!disposed) onStatus({ loading: false, count: 0, error: error instanceof Error && error.name !== 'AbortError' ? error.message : 'No se pudo cargar Internet gratuito. Vuelve a seleccionarlo para reintentar.' });
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void showSites();
    return () => {
      disposed = true;
      controller.abort();
      window.clearTimeout(timeout);
      if (redraw) map.off('moveend', redraw);
      group?.remove();
      renderer?.remove();
    };
  }, [map, enabled, onStatus]);

  return null;
}