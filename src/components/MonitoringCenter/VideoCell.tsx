// Celda individual de video: iframe multi-fuente + overlay + controles

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Camera } from './types';
import { Button } from '@/components/ui/button';
import { CameraOff, Volume2, VolumeX, Maximize2, ExternalLink, RefreshCw } from 'lucide-react';

interface VideoCellProps {
  camera: Camera | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onExpand: () => void;
}

const LOAD_TIMEOUT = 15000; // 15s

const VideoCell: React.FC<VideoCellProps> = ({
  camera,
  isMuted,
  onToggleMute,
  onExpand,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // Reset state when camera changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (camera?.embedUrl) {
      timeoutRef.current = setTimeout(() => {
        // After timeout, just stop showing loading (iframe may still work)
        setIsLoading(false);
      }, LOAD_TIMEOUT);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [camera?.id]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
  }, []);

  // Sin cámara asignada
  if (!camera) {
    return (
      <div className="relative w-full h-full bg-[hsl(var(--monitor-background))] flex items-center justify-center border border-[hsl(var(--monitor-border))]">
        <CameraOff className="w-8 h-8 text-[hsl(var(--monitor-muted))]" />
      </div>
    );
  }

  // Tipo external_url — solo placeholder con botón
  if (camera.sourceType === 'external_url' || camera.sourceType === 'skylinewebcams' || camera.sourceType === 'earthtv' || camera.sourceType === 'webcamsdemexico') {
    return (
      <div className="relative w-full h-full bg-[hsl(var(--monitor-background))] flex flex-col items-center justify-center border border-[hsl(var(--monitor-border))] gap-3">
        <CameraOff className="w-8 h-8 text-[hsl(var(--monitor-muted))]" />
        <span className="font-mono text-xs text-[hsl(var(--monitor-muted))] text-center px-2">{camera.name}</span>
        {camera.externalUrl && (
          <a
            href={camera.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--monitor-accent))]/20 text-[hsl(var(--monitor-accent))] font-mono text-[11px] uppercase tracking-wider hover:bg-[hsl(var(--monitor-accent))]/30 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Ver en vivo →
          </a>
        )}
        {/* Botón cambiar cámara */}
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-[hsl(var(--monitor-background))]/70 flex items-center justify-between">
          <span className="font-mono text-[10px] text-[hsl(var(--monitor-muted))] truncate">
            {camera.name}
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError || !camera.embedUrl) {
    return (
      <div className="relative w-full h-full bg-[hsl(var(--monitor-background))] flex flex-col items-center justify-center border border-[hsl(var(--monitor-border))] gap-2">
        <CameraOff className="w-8 h-8 text-[hsl(var(--monitor-muted))]" />
        <span className="font-mono text-xs text-[hsl(var(--monitor-muted))] uppercase tracking-wider">Sin señal</span>
        <div className="flex gap-2 mt-1">
          {camera.embedUrl && (
            <Button variant="ghost"
              onClick={handleRetry}
              className="flex items-center gap-1 px-2 py-1 bg-[hsl(var(--monitor-border))] text-[hsl(var(--monitor-muted))] font-mono text-[10px] hover:text-[hsl(var(--monitor-foreground))] transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Reintentar
            </Button>
          )}
          {camera.externalUrl && (
            <a
              href={camera.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 bg-[hsl(var(--monitor-border))] text-[hsl(var(--monitor-muted))] font-mono text-[10px] hover:text-[hsl(var(--monitor-accent))] transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Ver en navegador
            </a>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-[hsl(var(--monitor-background))]/70 flex items-center justify-between">
          <span className="font-mono text-[10px] text-[hsl(var(--monitor-muted))] truncate">
            {camera.name}
          </span>
        </div>
      </div>
    );
  }

  // Feed activo — construir URL del iframe según sourceType
  let iframeSrc = camera.embedUrl;
  // Para YouTube, manejar mute dinámicamente
  if (camera.sourceType === 'youtube' || camera.sourceType === 'youtube_channel') {
    const muteVal = isMuted ? '1' : '0';
    iframeSrc = camera.embedUrl.replace(/mute=1/, `mute=${muteVal}`);
  }

  return (
    <div className="relative w-full h-full bg-[hsl(var(--monitor-background))] border border-[hsl(var(--monitor-border))] overflow-hidden group">
      {/* iframe */}
      <iframe
        key={hasError ? 'retry' : camera.id}
        src={iframeSrc}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        onError={handleError}
        onLoad={handleLoad}
        title={`${camera.name} - ${camera.city}`}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[hsl(var(--monitor-background))] flex items-center justify-center z-5">
          <div className="w-5 h-5 border-2 border-[hsl(var(--monitor-accent))]/30 border-t-[hsl(var(--monitor-accent))] rounded-full animate-spin" />
        </div>
      )}

      {/* Indicador EN VIVO */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-[hsl(var(--monitor-background))]/60 px-1.5 py-0.5 z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
        <span className="font-mono text-[9px] text-destructive font-bold uppercase tracking-widest">
          En vivo
        </span>
      </div>

      {/* Controles */}
      <div className="absolute top-1.5 left-1.5 flex gap-1 z-10">
        {(camera.sourceType === 'youtube' || camera.sourceType === 'youtube_channel') && (
          <Button variant="ghost"
            onClick={onToggleMute}
            size="icon"
            className="h-8 w-8 rounded-none bg-[hsl(var(--monitor-background))]/70 p-1 text-[hsl(var(--monitor-foreground))]/80 hover:text-[hsl(var(--monitor-accent))] transition-colors"
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </Button>
        )}
        <Button variant="ghost"
          onClick={onExpand}
          size="icon"
            className="h-8 w-8 rounded-none bg-[hsl(var(--monitor-background))]/70 p-1 text-[hsl(var(--monitor-foreground))]/80 hover:text-[hsl(var(--monitor-accent))] transition-colors opacity-0 group-hover:opacity-100"
          title="Pantalla completa"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Barra inferior: ciudad + CAMBIAR CÁMARA */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-[hsl(var(--monitor-background))]/70 flex items-center justify-between z-10">
        <span className="font-mono text-[10px] text-[hsl(var(--monitor-muted))] truncate">
          {camera.name}
        </span>
      </div>
    </div>
  );
};

export default VideoCell;
