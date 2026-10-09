import { useState, useCallback, useEffect } from 'react';
import { LayoutType, MonitoringState } from './types';
import { fixedMonitoringState } from './fixedMonitoringState';

const STORAGE_KEY = 'mats-monitoring-center-v11';

export function useCameraStore() {
  const [state, setState] = useState<MonitoringState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return fixedMonitoringState(raw ? JSON.parse(raw) : null);
    } catch {
      return fixedMonitoringState(null);
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage unavailable */ }
  }, [state]);

  const setLayout = useCallback((layout: LayoutType) => {
    setState(previous => fixedMonitoringState({ ...previous, layout }));
  }, []);

  const toggleMute = useCallback((slotIndex: number) => {
    setState(previous => fixedMonitoringState({
      ...previous,
      allCells: previous.allCells?.map(cell => cell.slotIndex === slotIndex
        ? { ...cell, isMuted: !cell.isMuted } : cell),
    }));
  }, []);

  return { layout: state.layout, cells: state.cells, setLayout, toggleMute };
}
