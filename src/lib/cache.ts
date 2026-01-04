const CACHE_PREFIX = 'mydash-cache';

interface CacheEntry<T> {
  value: T;
  savedAt: number;
}

export const HOME_CACHE_TTL_MS = 1000 * 60 * 5;

export function readCache<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > maxAgeMs) return null;
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  try {
    const entry: CacheEntry<T> = { value, savedAt: Date.now() };
    window.localStorage.setItem(`${CACHE_PREFIX}:${key}`, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (quota, disabled, etc.)
  }
}
