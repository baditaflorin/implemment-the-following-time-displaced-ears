const i="0.26.4",n=`https://cdn.jsdelivr.net/pyodide/v${i}/full/`;let r=null,o=null;const s=(a,e)=>{const t={type:"status",phase:a,...e!==void 0?{detail:e}:{}};self.postMessage(t)};async function c(){return r||o||(o=(async()=>{s("loading-pyodide",i),self.importScripts(`${n}pyodide.js`);const a=await self.loadPyodide({indexURL:n});return s("loading-librosa"),await a.loadPackage(["numpy","scipy"]),await a.loadPackage("librosa").catch(async()=>{await a.loadPackage("micropip"),await a.runPythonAsync(`
import micropip
await micropip.install('librosa')
      `)}),s("warming-up"),await a.runPythonAsync(`
import numpy as np
import librosa
_warm = np.zeros(2048, dtype=np.float32)
librosa.feature.mfcc(y=_warm, sr=22050, n_mfcc=4)
    `),r=a,s("ready"),a})(),o)}self.addEventListener("message",a=>{m(a.data)});async function m(a){try{const e=a;if(!e||!(e.audio instanceof Float32Array))throw new Error("analysis worker: bad payload");const t=await c();s("analyzing",`${e.audio.length} samples @ ${e.sampleRate}Hz`),t.globals.set("audio_buffer",e.audio),t.globals.set("sr_in",e.sampleRate);const l=await t.runPythonAsync(`
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
    `),p={type:"result",payload:JSON.parse(l)};self.postMessage(p)}catch(e){const t={type:"error",message:e instanceof Error?e.message:String(e)};self.postMessage(t)}}
