/// <reference lib="webworker" />

// Lazy-loads Pyodide + librosa from the public CDN on first message.
// Receives Float32Array audio frames + sample rate; returns a feature summary.

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

type StatusMessage = { type: 'status'; phase: string; detail?: string };
type ResultMessage = { type: 'result'; payload: AnalysisResult };
type ErrorMessage = { type: 'error'; message: string };
type WorkerOutbound = StatusMessage | ResultMessage | ErrorMessage;

export interface AnalysisResult {
  durationSec: number;
  sampleRate: number;
  rms: number;
  peak: number;
  zeroCrossingRate: number;
  spectralCentroidHz: number;
  spectralRolloffHz: number;
  estimatedTempoBpm: number | null;
  onsetCount: number;
  mfccMean: number[];
}

declare const self: DedicatedWorkerGlobalScope & { loadPyodide?: (opts: any) => Promise<any> };
let pyodide: any = null;
let loading: Promise<any> | null = null;

const status = (phase: string, detail?: string): void => {
  const m: StatusMessage = { type: 'status', phase, ...(detail !== undefined ? { detail } : {}) };
  self.postMessage(m);
};

async function ensurePyodide(): Promise<any> {
  if (pyodide) return pyodide;
  if (loading) return loading;
  loading = (async (): Promise<any> => {
    status('loading-pyodide', PYODIDE_VERSION);
    self.importScripts(`${PYODIDE_INDEX}pyodide.js`);
    const py = await self.loadPyodide!({ indexURL: PYODIDE_INDEX });
    status('loading-librosa');
    await py.loadPackage(['numpy', 'scipy']);
    await py.loadPackage('librosa').catch(async () => {
      await py.loadPackage('micropip');
      await py.runPythonAsync(`
import micropip
await micropip.install('librosa')
      `);
    });
    status('warming-up');
    await py.runPythonAsync(`
import numpy as np
import librosa
_warm = np.zeros(2048, dtype=np.float32)
librosa.feature.mfcc(y=_warm, sr=22050, n_mfcc=4)
    `);
    pyodide = py;
    status('ready');
    return py;
  })();
  return loading;
}

self.addEventListener('message', (ev: MessageEvent) => {
  void handle(ev.data);
});

async function handle(msg: unknown): Promise<void> {
  try {
    const data = msg as { audio: Float32Array; sampleRate: number };
    if (!data || !(data.audio instanceof Float32Array)) {
      throw new Error('analysis worker: bad payload');
    }
    const py = await ensurePyodide();
    status('analyzing', `${data.audio.length} samples @ ${data.sampleRate}Hz`);

    py.globals.set('audio_buffer', data.audio);
    py.globals.set('sr_in', data.sampleRate);

    const json: string = await py.runPythonAsync(`
import json
import numpy as np
import librosa
import librosa.feature

y = np.asarray(audio_buffer, dtype=np.float32)
sr = int(sr_in)

# librosa prefers 22050 for general MIR; resample for tempo/onset speed
if sr != 22050:
    y22 = librosa.resample(y, orig_sr=sr, target_sr=22050)
else:
    y22 = y

duration = float(len(y) / sr)
rms = float(np.sqrt(np.mean(y ** 2)))
peak = float(np.max(np.abs(y)))
zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)[0]))

cent = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)[0]))
rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)[0]))

try:
    tempo, _ = librosa.beat.beat_track(y=y22, sr=22050)
    tempo_val = float(tempo) if not np.isnan(tempo) else None
except Exception:
    tempo_val = None

onsets = librosa.onset.onset_detect(y=y22, sr=22050, units='time')
onset_count = int(len(onsets))

mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
mfcc_mean = [float(x) for x in np.mean(mfcc, axis=1).tolist()]

json.dumps({
    'durationSec': duration,
    'sampleRate': sr,
    'rms': rms,
    'peak': peak,
    'zeroCrossingRate': zcr,
    'spectralCentroidHz': cent,
    'spectralRolloffHz': rolloff,
    'estimatedTempoBpm': tempo_val,
    'onsetCount': onset_count,
    'mfccMean': mfcc_mean,
})
    `);

    const payload = JSON.parse(json) as AnalysisResult;
    const out: ResultMessage = { type: 'result', payload };
    self.postMessage(out);
  } catch (err) {
    const out: ErrorMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(out);
  }
}

export type { WorkerOutbound };
