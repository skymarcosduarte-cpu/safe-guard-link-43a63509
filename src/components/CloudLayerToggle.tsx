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
    // NASA GIBS infrared (Band 13 Clean IR): GOES-East, GOES-West and Himawari
    // give continuous global coverage from a reliable global CDN. "default" time
    // always resolves to the latest available frame.
    const TRANSPARENT =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const mk = (layer: string) =>
      L.tileLayer(`${GIBS_BASE}/${layer}/default/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`, {
        opacity: 0.85,
        zIndex: 5,
        className: 'cloud-ir-tiles',
        attribution: 'Nubes: NASA GIBS',
        maxNativeZoom: 7,
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
