// Centro de Monitoreo — pantalla principal — v2

import React, { useState, useEffect } from 'react';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { useCameraStore } from './useCameraStore';
import { DEFAULT_CAMERAS, LAYOUT_OPTIONS } from './cameraData';
import GridLayout from './GridLayout';
import FullscreenModal from './FullscreenModal';
import { Button } from '@/components/ui/button';

interface MonitoringCenterProps {
  onBack: () => void;
}

const MonitoringCenter: React.FC<MonitoringCenterProps> = ({ onBack }) => {
  const store = useCameraStore();
  const [clock, setClock] = useState(new Date());
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allCameras = DEFAULT_CAMERAS;
  const activeCells = store.cells.length;

  // Datos de celda expandida
  const expandedCell = expandedSlot !== null ? store.cells.find(c => c.slotIndex === expandedSlot) : null;
  const expandedCamera = expandedCell?.cameraId
    ? allCameras.find(c => c.id === expandedCell.cameraId) ?? null
    : null;

  const timeStr = clock.toLocaleTimeString('es-MX', { hour12: false });
  const dateStr = clock.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="monitoring-center flex flex-col h-full bg-[hsl(var(--monitor-background))] text-[hsl(var(--monitor-foreground))] select-none">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 bg-[hsl(var(--monitor-surface))] border-b border-[hsl(var(--monitor-border))] shrink-0">
        <BackToHomeButton onClick={onBack} />

        <div className="flex items-center gap-1.5 mr-auto">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--monitor-accent))] animate-pulse" />
          <h1 className="font-mono text-xs sm:text-sm font-bold text-[hsl(var(--monitor-accent))] uppercase tracking-widest">
            Centro de Monitoreo
          </h1>
        </div>

        {/* Indicador cámaras activas */}
        <span className="font-mono text-[9px] text-[hsl(var(--monitor-muted))] hidden sm:block">
          {activeCells}/{store.cells.length} activas
        </span>

        {/* Selector de layout */}
        <div className="flex items-center gap-0.5 bg-[hsl(var(--monitor-surface))] border border-[hsl(var(--monitor-border))] px-1 py-0.5">
          {LAYOUT_OPTIONS.map(opt => (
            <Button variant="ghost"
              key={opt.type}
              onClick={() => store.setLayout(opt.type)}
              className={`h-7 rounded-none font-mono text-[10px] px-1.5 py-0.5 transition-colors ${
                store.layout === opt.type
                  ? 'bg-[hsl(var(--monitor-accent))] text-[hsl(var(--monitor-background))] font-bold'
                  : 'text-[hsl(var(--monitor-muted))] hover:text-[hsl(var(--monitor-accent))]'
              }`}
              title={opt.label}
              aria-pressed={store.layout === opt.type}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Timestamp */}
        <div className="hidden sm:flex flex-col items-end font-mono text-[9px] text-[hsl(var(--monitor-muted))] leading-tight">
          <span>{timeStr}</span>
          <span>{dateStr}</span>
        </div>
      </div>

      {/* Cuadrícula */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <GridLayout
          layout={store.layout}
          cells={store.cells}
          allCameras={allCameras}
          onToggleMute={store.toggleMute}
          onExpand={setExpandedSlot}
        />
      </div>

      {/* Modal fullscreen */}
      <FullscreenModal
        camera={expandedCamera}
        open={expandedSlot !== null}
        isMuted={expandedCell?.isMuted ?? true}
        onClose={() => setExpandedSlot(null)}
        onToggleMute={() => expandedSlot !== null && store.toggleMute(expandedSlot)}
      />
    </div>
  );
};

export default MonitoringCenter;
