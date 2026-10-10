// Cloud Layer Toggle — satellite infrared cloud overlay for the Community Map.
// Uses RainViewer's free satellite (infrared) tiles, refreshed every 10 minutes.
// A floating button toggles the layer; cyclone markers come from LiveEventsMapView.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { CloudSun, Loader2 } from 'lucide-react';

interface CloudLayerToggleProps {
  map: L.Map | null;
}

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';
const REFRESH_MS = 10 * 60 * 1000;

async function fetchLatestSatellitePath(): Promise<string | null> {
  try {
    const res = await fetch(RAINVIEWER_API);
    if (!res.ok) return null;
    const data = await res.json();
    const frames: { time: number; path: string }[] = data?.satellite?.infrared || [];
    if (!frames.length) return null;
    // Use the most recent frame
    return frames[frames.length - 1].path;
  } catch {
    return null;
  }
}

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
    const path = await fetchLatestSatellitePath();
    setLoading(false);
    if (!path) return;

    // Swap in the newest frame
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    const layer = L.tileLayer(
      `https://tilecache.rainviewer.com${path}/512/{z}/{x}/{y}/2/1_1.png`,
      {
        opacity: 0.65,
        zIndex: 5,
        attribution: 'Nubes: RainViewer',
      }
    );
    layer.addTo(map);
    layerRef.current = layer;
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
      className={`absolute bottom-24 right-3 z-[1000] flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold shadow-lg border-2 transition-colors ${
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
