import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMERAS, LAYOUT_OPTIONS } from './cameraData';
import { fixedMonitoringState } from './fixedMonitoringState';

describe('fixed monitoring services', () => {
  it('only allows the three requested layouts', () => {
    expect(LAYOUT_OPTIONS.map(option => [option.type, option.cells])).toEqual([
      ['1x1', 1], ['2x1', 2], ['2x2', 4],
    ]);
    expect(fixedMonitoringState({ layout: '3x3' }).layout).toBe('2x2');
  });

  it('keeps only N+, CNN Español, Euronews Español and Al Jazeera in fixed order', () => {
    const ids = ['yt-nplus-live', 'yt-cnn-es-live', 'yt-euronews-es', 'yt-al-jazeera-live'];
    expect(DEFAULT_CAMERAS.map(camera => camera.id)).toEqual(ids);
    const migrated = fixedMonitoringState({ cells: [{ slotIndex: 0, cameraId: 'yt-tokyo', isMuted: false }], customCameras: [{ id: 'custom' }] });
    expect(migrated.cells.map(cell => cell.cameraId)).toEqual(ids);
    expect(migrated.customCameras).toEqual([]);
  });

  it('retains audio activation when reducing and restoring the layout', () => {
    const initial = fixedMonitoringState(null);
    const soundOn = { ...initial, allCells: initial.allCells?.map(cell => ({ ...cell, isMuted: cell.slotIndex !== 3 })) };
    const single = fixedMonitoringState({ ...soundOn, layout: '1x1' });
    expect(single.cells.map(cell => cell.cameraId)).toEqual(['yt-nplus-live']);
    const double = fixedMonitoringState({ ...single, layout: '2x1' });
    expect(double.cells.map(cell => cell.cameraId)).toEqual(['yt-nplus-live', 'yt-cnn-es-live']);
    const restored = fixedMonitoringState({ ...double, layout: '2x2' });
    expect(restored.cells[3].isMuted).toBe(false);
  });
});