export interface FeatureSupport {
  audioWorklet: boolean;
  getUserMedia: boolean;
  webgpu: boolean;
  offlineAudio: boolean;
}

export function detectFeatures(): FeatureSupport {
  const hasGUM =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';
  const hasAW = typeof AudioWorkletNode !== 'undefined';
  const hasGPU = typeof (navigator as unknown as { gpu?: unknown }).gpu !== 'undefined';
  const hasOA = typeof OfflineAudioContext !== 'undefined';
  return {
    audioWorklet: hasAW,
    getUserMedia: hasGUM,
    webgpu: hasGPU,
    offlineAudio: hasOA,
  };
}

export function describeMissing(s: FeatureSupport): string[] {
  const missing: string[] = [];
  if (!s.getUserMedia) missing.push('microphone API');
  if (!s.audioWorklet) missing.push('AudioWorklet');
  return missing;
}
