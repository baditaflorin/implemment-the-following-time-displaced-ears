import type { EngineParams } from '../audio/engine';

const KEY = 'tde:prefs:v1';

export function loadPrefs(): Partial<EngineParams> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Partial<EngineParams>;
  } catch {
    return {};
  }
}

export function savePrefs(p: EngineParams): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // localStorage can be unavailable (private mode); silently degrade
  }
}
