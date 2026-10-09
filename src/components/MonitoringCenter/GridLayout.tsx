// Cuadrícula de celdas de video con layouts configurables — v2

import React from 'react';
import { LayoutType, CellConfig, Camera } from './types';
import VideoCell from './VideoCell';

interface GridLayoutProps {
  layout: LayoutType;
  cells: CellConfig[];
  allCameras: Camera[];
  onToggleMute: (slot: number) => void;
  onExpand: (slot: number) => void;
}

function getGridClass(layout: LayoutType): string {
  switch (layout) {
    case '1x1': return 'grid-cols-1 grid-rows-1';
    case '2x1': return 'grid-cols-2 grid-rows-1';
    case '2x2': return 'grid-cols-2 grid-rows-2';
    default: return 'grid-cols-2 grid-rows-2';
  }
}

const GridLayout: React.FC<GridLayoutProps> = ({
  layout,
  cells,
  allCameras,
  onToggleMute,
  onExpand,
}) => {
  const findCamera = (cameraId: string | null) =>
    cameraId ? allCameras.find(c => c.id === cameraId) ?? null : null;

  return (
    <div className={`grid ${getGridClass(layout)} gap-[1px] bg-[hsl(var(--monitor-surface))] flex-1 w-full h-full`}>
      {cells.map((cell) => (
        <div key={cell.slotIndex} className="min-h-0 min-w-0">
          <VideoCell
            camera={findCamera(cell.cameraId)}
            isMuted={cell.isMuted}
            onToggleMute={() => onToggleMute(cell.slotIndex)}
            onExpand={() => onExpand(cell.slotIndex)}
          />
        </div>
      ))}
    </div>
  );
};

export default GridLayout;
