// Cloud Layer Toggle — satellite infrared cloud overlay for the Community Map.
// Uses NOAA GOES infrared tiles, refreshed every 10 minutes.
// A floating button toggles the layer; cyclone markers come from LiveEventsMapView.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { CloudSun, Loader2 } from 'lucide-react';

interface CloudLayerToggleProps {
  map: L.Map | null;
}

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';
const REFRESH_MS = 10 * 60 * 1000;

export const CloudLayerToggle: React.FC<CloudLayerToggleProps> = ({ map }) => {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const layerRef = useRef<L.TileLayer | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

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
    // GOES East + West infrared (NOAA via Iowa Mesonet). Bright, opaque clouds.
    const bust = Math.floor(Date.now() / REFRESH_MS);
    const mk = (name: string) =>
      L.tileLayer(`https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/${name}/{z}/{x}/{y}.png?t=${bust}`, {
        opacity: 0.9, zIndex: 5, className: 'cloud-ir-tiles', attribution: 'Nubes: NOAA GOES / IEM',
      });
    const group = L.layerGroup([mk('goes-west-ir-4km-900913'), mk('goes-east-ir-4km-900913')]);
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

  return (
    <button
      onClick={toggle}
      className={`fixed bottom-48 right-4 z-[1500] flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold shadow-lg border-2 transition-colors ${
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
  );
};

export default CloudLayerToggle;
