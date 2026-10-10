// Cloud Layer Toggle — satellite infrared cloud overlay for the Community Map.
// Uses NASA GIBS infrared tiles (GOES-East, GOES-West, Himawari) for continuous
// global coverage, refreshed every 10 minutes.
// A floating button toggles the layer; cyclone markers come from LiveEventsMapView.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { CloudSun, Loader2 } from 'lucide-react';

interface CloudLayerToggleProps {
  map: L.Map | null;
}

const GIBS_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const REFRESH_MS = 10 * 60 * 1000;
// Nubes arranca semi-transparente (35%) para que el mapa y las trayectorias se
// vean debajo; el usuario la sube o baja con el control si lo desea.
const DEFAULT_CLOUD_OPACITY = 0.35;

export const CloudLayerToggle: React.FC<CloudLayerToggleProps> = ({ map }) => {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opacity, setOpacity] = useState(DEFAULT_CLOUD_OPACITY);
  const layerRef = useRef<L.TileLayer | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const opacityRef = useRef(DEFAULT_CLOUD_OPACITY);

  const removeLayer = useCallback(() => {
    if (layerRef.current && map) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, [map]);

  const addLayer = useCallback(async () => {
    if (!map) return;
    setLoading(true);
    if (layerRef.current) {
      map.removeLayer(layerRef.current as any);
      layerRef.current = null;
    }
    // NASA GIBS infrared (Band 13 Clean IR): GOES-East, GOES-West and Himawari
    // give continuous global coverage from a reliable global CDN. "default" time
    // always resolves to the latest available frame.
    const TRANSPARENT =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const mk = (layer: string) =>
      L.tileLayer(`${GIBS_BASE}/${layer}/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`, {
        opacity: opacityRef.current,
        zIndex: 5,
        className: 'cloud-ir-tiles',
        attribution: 'Nubes: NASA GIBS',
        maxNativeZoom: 6,
        errorTileUrl: TRANSPARENT,
        updateWhenIdle: false,
        keepBuffer: 4,
        crossOrigin: true,
      });
    const group = L.layerGroup([
      // Himawari-9 (Asia/Oceania, ~140.7°E)
      mk('Himawari_AHI_Band13_Clean_Infrared'),
      // GOES-West (Pacific/Americas, ~137.2°W)
      mk('GOES-West_ABI_Band13_Clean_Infrared'),
      // GOES-East (Americas/Atlantic, ~75.2°W) — on top where disks overlap
      mk('GOES-East_ABI_Band13_Clean_Infrared'),
    ]);
    group.addTo(map);
    layerRef.current = group as any;
    setLoading(false);
  }, [map]);

  const toggle = useCallback(async () => {
    if (active) {
      removeLayer();
      setActive(false);
      return;
    }
    setActive(true);
    await addLayer();
    // Keep the clouds fresh while the layer is on
    refreshTimerRef.current = window.setInterval(addLayer, REFRESH_MS);
  }, [active, addLayer, removeLayer]);

  // Cleanup on unmount / map change
  useEffect(() => {
    return () => removeLayer();
  }, [removeLayer]);

  const changeOpacity = useCallback((value: number) => {
    opacityRef.current = value;
    setOpacity(value);
    const group = layerRef.current as unknown as L.LayerGroup | null;
    if (group) {
      group.eachLayer((child) => {
        (child as L.TileLayer).setOpacity(value);
      });
    }
  }, []);

  return (
    <div className="fixed bottom-48 right-4 z-[1500] flex flex-col items-end gap-2">
      {active && (
        <div className="rounded-2xl border-2 border-sky-600 bg-white/95 px-4 py-3 shadow-lg">
          <label
            htmlFor="cloud-opacity"
            className="mb-1 block text-xs font-bold text-sky-800"
          >
            Opacidad de nubes: {Math.round(opacity * 100)}%
          </label>
          <input
            id="cloud-opacity"
            type="range"
            min={10}
            max={100}
            step={5}
            value={Math.round(opacity * 100)}
            onChange={(e) => changeOpacity(Number(e.target.value) / 100)}
            className="w-44 accent-sky-600"
            aria-label="Opacidad de la capa de nubes"
          />
        </div>
      )}
      <button
        onClick={toggle}
        className={`flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold shadow-lg border-2 transition-colors ${
          active
            ? 'bg-sky-600 text-white border-sky-300'
            : 'bg-white text-sky-700 border-sky-600'
        }`}
        aria-pressed={active}
        aria-label="Mostrar nubosidad actual"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <CloudSun className="w-5 h-5" />
        )}
        {active ? 'Nubes: ON' : 'Nubes'}
      </button>
    </div>
  );
};

export default CloudLayerToggle;
