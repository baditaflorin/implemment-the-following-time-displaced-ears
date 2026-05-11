import { describe, it, expect, beforeEach } from 'vitest';
import { loadPrefs, savePrefs } from '../../src/lib/prefs';
import { DEFAULT_PARAMS } from '../../src/audio/engine';

describe('prefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns {} when nothing saved', () => {
    expect(loadPrefs()).toEqual({});
  });

  it('round-trips DEFAULT_PARAMS', () => {
    savePrefs(DEFAULT_PARAMS);
    expect(loadPrefs()).toEqual(DEFAULT_PARAMS);
  });

  it('ignores garbage in localStorage', () => {
    localStorage.setItem('tde:prefs:v1', '{not json}');
    expect(loadPrefs()).toEqual({});
  });

  it('ignores non-object JSON', () => {
    localStorage.setItem('tde:prefs:v1', '42');
    expect(loadPrefs()).toEqual({});
  });
});
