import { mountApp } from './ui/app';
import { registerServiceWorker } from './lib/sw-register';
import pitchShifterWorkletUrl from './audio/worklets/pitch-shifter.worklet?worker&url';
import spectralWorkletUrl from './audio/worklets/spectral.worklet?worker&url';
import './style.css';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Mount node #app missing from index.html');
}
mountApp(root);
registerServiceWorker();

// Debug surface — used by tests/dsp/* to load worklets into an
// OfflineAudioContext without re-bundling. Tiny payload (one string).
(window as unknown as { __tde__: Record<string, string> }).__tde__ = {
  pitchShifterWorkletUrl,
  spectralWorkletUrl,
};
