import type { AudioEngine } from '../audio/engine';
import type { AnalysisClient, AnalysisResult } from '../features/analysis/analysis-client';
import { encodeWavMono16, triggerDownload } from '../lib/wav';

const CAPTURE_SEC = 5;

export function mountAnalysisPanel(card: HTMLElement, engine: AudioEngine): void {
  card.innerHTML = `
    <h2>Offline analysis (Pyodide + librosa)</h2>
    <p style="margin: 0; color: var(--fg-dim); font-size: 0.85rem;">
      Captures ${CAPTURE_SEC} seconds of the post-filter input and runs it through librosa
      in your browser. The first analysis lazy-loads ~25 MB of Pyodide + numpy + scipy + librosa
      from a public CDN — subsequent runs are instant. Nothing leaves your device.
    </p>
    <div class="row">
      <button id="analyze">Capture &amp; analyze ${CAPTURE_SEC}s</button>
      <button id="save-wav" disabled>Save last capture as WAV</button>
      <span id="analyze-status" class="status">ready (worker not loaded)</span>
    </div>
    <div id="analysis-output" class="analysis-output hidden"></div>
  `;
  const btn = card.querySelector<HTMLButtonElement>('#analyze')!;
  const saveBtn = card.querySelector<HTMLButtonElement>('#save-wav')!;
  const statusEl = card.querySelector<HTMLSpanElement>('#analyze-status')!;
  const outputEl = card.querySelector<HTMLDivElement>('#analysis-output')!;

  let client: AnalysisClient | null = null;
  let running = false;
  let lastCapture: { audio: Float32Array; sampleRate: number } | null = null;

  saveBtn.addEventListener('click', () => {
    if (!lastCapture) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const blob = encodeWavMono16(lastCapture.audio, lastCapture.sampleRate);
    triggerDownload(blob, `time-displaced-ears-${stamp}.wav`);
  });

  const setStatus = (text: string, cls: 'ok' | 'warn' | 'err' | null = null): void => {
    statusEl.textContent = text;
    statusEl.classList.remove('ok', 'warn', 'err');
    if (cls) statusEl.classList.add(cls);
  };

  btn.addEventListener('click', () => {
    void runAnalysis();
  });

  async function runAnalysis(): Promise<void> {
    if (running) return;
    if (engine.getState() !== 'running') {
      setStatus('start listening first', 'warn');
      return;
    }
    running = true;
    btn.disabled = true;
    outputEl.classList.add('hidden');
    try {
      setStatus(`capturing ${CAPTURE_SEC}s …`, 'warn');
      const audio = await engine.captureRawInput(CAPTURE_SEC);
      const sampleRate = engine.getSampleRate();
      // Keep a copy for WAV export — the worker call transfers ownership.
      lastCapture = { audio: new Float32Array(audio), sampleRate };
      saveBtn.disabled = false;

      if (!client) {
        const mod = await import('../features/analysis/analysis-client');
        client = new mod.AnalysisClient({
          onStatus: (phase, detail) => {
            setStatus(detail ? `${phase}: ${detail}` : phase, 'warn');
          },
        });
      }

      setStatus('analyzing …', 'warn');
      const result = await client.analyze(audio, sampleRate);
      renderResult(result);
      setStatus('done', 'ok');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`error: ${msg}`, 'err');
    } finally {
      running = false;
      btn.disabled = false;
    }
  }

  function renderResult(r: AnalysisResult): void {
    outputEl.classList.remove('hidden');
    const tempo = r.estimatedTempoBpm ? `${r.estimatedTempoBpm.toFixed(1)} BPM` : '—';
    outputEl.textContent =
      `duration       ${r.durationSec.toFixed(2)} s\n` +
      `sample rate    ${r.sampleRate} Hz\n` +
      `RMS            ${r.rms.toFixed(4)}\n` +
      `peak           ${r.peak.toFixed(4)}\n` +
      `zero-crossing  ${r.zeroCrossingRate.toFixed(4)}\n` +
      `centroid       ${r.spectralCentroidHz.toFixed(1)} Hz\n` +
      `rolloff(85%)   ${r.spectralRolloffHz.toFixed(1)} Hz\n` +
      `tempo (guess)  ${tempo}\n` +
      `onsets in 5s   ${r.onsetCount}\n` +
      `\nMFCC mean (13 coeffs)\n` +
      r.mfccMean.map((v, i) => `  c${String(i).padStart(2, '0')}  ${v.toFixed(3)}`).join('\n');
  }
}
