// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  effect: undefined as undefined | (() => (() => void) | void),
  check: vi.fn(),
}));
vi.mock('react', () => ({
  useEffect: (effect: () => (() => void) | void) => { harness.effect = effect; },
  useRef: (value: boolean) => ({ current: value }),
}));
vi.mock('@/lib/versionCheck', () => ({
  APP_VERSION: '2.9.7',
  checkForUpdates: harness.check,
  isNewerVersionAvailable: (current: string, latest: string) => current !== latest,
}));
import { useAutoUpdate } from './useAutoUpdate';

describe('automatic update reload protection', () => {
  let cleanup: (() => void) | void;
  let location: { href: string };
  const cacheKeys = vi.fn().mockResolvedValue(['app-cache']);
  const cacheDelete = vi.fn().mockResolvedValue(true);
  const foreground = async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
  };
  const mount = async () => {
    useAutoUpdate();
    cleanup = harness.effect?.();
    await vi.advanceTimersByTimeAsync(500);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    sessionStorage.clear();
    location = { href: 'http://localhost:8080/map?mode=cyclones#details' };
    vi.stubGlobal('window', { location, caches: {} });
    vi.stubGlobal('caches', { keys: cacheKeys, delete: cacheDelete });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    harness.check.mockResolvedValue({ latest: '2.9.8' });
  });
  afterEach(() => {
    cleanup?.();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reloads only once for 2.9.7 → 2.9.8 across repeated returns and remounts', async () => {
    await mount();
    const firstUrl = location.href;
    await foreground();
    await foreground();
    cleanup?.();
    await mount();
    expect(harness.check).toHaveBeenCalledTimes(4);
    expect(cacheKeys).toHaveBeenCalledTimes(1);
    expect(location.href).toBe(firstUrl);
    expect(sessionStorage.getItem('session-update-done')).toBe('2.9.7:2.9.8');
  });

  it('preserves the current path, query parameters and hash during the update', async () => {
    await mount();
    const url = new URL(location.href);
    expect(url.pathname).toBe('/map');
    expect(url.searchParams.get('mode')).toBe('cyclones');
    expect(url.hash).toBe('#details');
    expect(url.searchParams.has('v')).toBe(true);
  });

  it('still detects and applies a different release on return', async () => {
    await mount();
    harness.check.mockResolvedValue({ latest: '2.9.9' });
    await foreground();
    expect(cacheKeys).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem('session-update-done')).toBe('2.9.7:2.9.9');
  });

  it('does not erase the reload protection left by the previous implementation', async () => {
    sessionStorage.setItem('session-update-done', 'true');
    await mount();
    await foreground();
    expect(cacheKeys).not.toHaveBeenCalled();
    expect(location.href).toBe('http://localhost:8080/map?mode=cyclones#details');
  });

  it('does not start overlapping checks when returning during a pending request', async () => {
    let resolve: ((value: { latest: string }) => void) | undefined;
    harness.check.mockImplementation(() => new Promise<{ latest: string }>(done => { resolve = done; }));
    await mount();
    await foreground();
    expect(harness.check).toHaveBeenCalledTimes(1);
    resolve?.({ latest: '2.9.8' });
    await vi.advanceTimersByTimeAsync(0);
    expect(cacheKeys).toHaveBeenCalledTimes(1);
  });
});