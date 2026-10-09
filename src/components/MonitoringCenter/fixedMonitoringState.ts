import { DEFAULT_INITIAL_CAMERA_IDS, getCellCount, LAYOUT_OPTIONS } from './cameraData';
import { MonitoringState, LayoutType } from './types';

// Migrate any legacy assignments to the fixed channel order, retaining audio choices.
export function fixedMonitoringState(saved: unknown): MonitoringState {
  const value = saved && typeof saved === 'object' ? saved as Partial<MonitoringState> : {};
  const layout: LayoutType = LAYOUT_OPTIONS.some(option => option.type === value.layout)
    ? value.layout as LayoutType : '2x2';
  const previous = Array.isArray(value.allCells) ? value.allCells
    : Array.isArray(value.cells) ? value.cells : [];
  const allCells = DEFAULT_INITIAL_CAMERA_IDS.map((cameraId, slotIndex) => {
    const oldCell = previous.find(cell => cell?.cameraId === cameraId);
    return { slotIndex, cameraId, isMuted: typeof oldCell?.isMuted === 'boolean' ? oldCell.isMuted : true };
  });
  return { layout, allCells, cells: allCells.slice(0, getCellCount(layout)), customCameras: [] };
}