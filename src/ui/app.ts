import { AudioEngine, DEFAULT_PARAMS, type EngineParams, type SpectralMode } from '../audio/engine';
import { Spectrogram } from '../audio/spectrogram';
import { loadPrefs, savePrefs } from '../lib/prefs';
import { mountAnalysisPanel } from './analysis-panel';

interface Preset {
  id: string;
  name: string;
  hint: string;
  params: Partial<EngineParams>;
}

const PRESETS: Preset[] = [
  {
    id: 'delay-7s',
    name: 'Seven-second delay',
    hint: 'Hear the world 7s late',
    params: { delaySeconds: 7, pitchRatio: 1, highpassHz: 20, lowpassHz: 18000, dryWet: 1 },
  },
  {
    id: 'whale-song',
    name: 'Whale song',
    hint: 'Two octaves down',
    params: { delaySeconds: 0.01, pitchRatio: 0.25, highpassHz: 20, lowpassHz: 4000, dryWet: 1 },
  },
  {
    id: 'apartment-dream',
    name: 'Apartment dream',
    hint: 'Strip lows + light delay',
    params: { delaySeconds: 0.4, pitchRatio: 1, highpassHz: 800, lowpassHz: 18000, dryWet: 1 },
  },
  {
    id: 'underwater',
    name: 'Underwater',
    hint: 'Cut highs, slow pitch',
    params: { delaySeconds: 0.2, pitchRatio: 0.5, highpassHz: 20, lowpassHz: 1200, dryWet: 1 },
  },
  {
    id: 'monitor',
    name: 'Monitor (passthrough)',
    hint: 'Minimal processing',
    params: { delaySeconds: 0.01, pitchRatio: 1, highpassHz: 20, lowpassHz: 18000, dryWet: 0 },
  },
];

const FMT = {
  seconds: (v: number): string => (v < 1 ? `${(v * 1000).toFixed(0)}ms` : `${v.toFixed(2)}s`),
  ratio: (v: number): string => {
    const semitones = 12 * Math.log2(v);
    return `${semitones >= 0 ? '+' : ''}${semitones.toFixed(1)} st`;
  },
  hz: (v: number): string => (v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${v.toFixed(0)}Hz`),
  pct: (v: number): string => `${Math.round(v * 100)}%`,
};

export function mountApp(root: HTMLElement): void {
  const engine = new AudioEngine({
    onState: (s, info) => updateStatus(s, info),
    onLevel: (rms) => updateMeter(rms),
  });

  const initial: EngineParams = { ...DEFAULT_PARAMS, ...loadPrefs() };
  let params: EngineParams = initial;
  let spectro: Spectrogram | null = null;
  let activePresetId: string | null = null;

  root.innerHTML = `
    <div class="app">
      <header class="brand">
        <h1>time-displaced ears</h1>
        <span class="tag">hear the world delayed, pitched, filtered — locally</span>
        <span class="badge" id="badge">mic: off</span>
      </header>
      <main>
        <section class="card">
          <h2>Spectrogram</h2>
          <canvas id="spectrogram"></canvas>
          <div id="meter"><div class="fill"></div></div>
          <div class="row">
            <button id="start" class="primary">Start listening</button>
            <button id="stop" class="danger hidden">Stop</button>
            <span id="status" class="status">click start &amp; grant mic access</span>
          </div>
        </section>

        <section class="card">
          <h2>Presets</h2>
          <div class="toggle-grid" id="presets"></div>
        </section>

        <section class="card">
          <h2>Controls</h2>
          <div class="control" id="ctl-delay">
            <label for="delay">Delay</label>
            <input type="range" id="delay" min="0" max="30" step="0.05" />
            <span class="value">—</span>
          </div>
          <div class="control" id="ctl-pitch">
            <label for="pitch">Pitch</label>
            <input type="range" id="pitch" min="0.125" max="4" step="0.001" />
            <span class="value">—</span>
          </div>
          <div class="control" id="ctl-hpf">
            <label for="hpf">High-pass</label>
            <input type="range" id="hpf" min="20" max="8000" step="1" />
            <span class="value">—</span>
          </div>
          <div class="control" id="ctl-lpf">
            <label for="lpf">Low-pass</label>
            <input type="range" id="lpf" min="200" max="20000" step="10" />
            <span class="value">—</span>
          </div>
          <div class="control" id="ctl-mix">
            <label for="mix">Dry → Wet</label>
            <input type="range" id="mix" min="0" max="1" step="0.01" />
            <span class="value">—</span>
          </div>
          <div class="control" id="ctl-out">
            <label for="out">Output</label>
            <input type="range" id="out" min="0" max="1.5" step="0.01" />
            <span class="value">—</span>
          </div>
        </section>

        <section class="card">
          <h2>Spectral processor (STFT + WebAudio worklet)</h2>
          <p style="margin: 0; color: var(--fg-dim); font-size: 0.85rem;">
            Runs after the pitch shifter. <b>Freeze</b> captures the current
            frequency content and sustains it indefinitely. <b>Smear</b> low-pass
            filters magnitudes across frames — drone-like textures.
          </p>
          <div class="row" id="spectral-modes">
            <button data-spectral="bypass" class="active">Bypass</button>
            <button data-spectral="freeze">Freeze mode</button>
            <button data-spectral="smear">Smear mode</button>
          </div>
          <div class="row">
            <button id="freeze-now" disabled>Freeze the current spectrum</button>
            <button id="release-spectrum" disabled>Release</button>
          </div>
        </section>

        <section class="card" id="analysis-card">
          <h2>Offline analysis (Pyodide + librosa)</h2>
        </section>
      </main>

      <footer>
        <span>v0.3.0 · processed locally, no audio leaves your device · installable as a PWA</span>
        <span>
          <a href="https://github.com/baditaflorin/implemment-the-following-time-displaced-ears" target="_blank" rel="noreferrer">source</a>
          · <a href="https://github.com/baditaflorin/implemment-the-following-time-displaced-ears/blob/main/docs/privacy.md" target="_blank" rel="noreferrer">privacy</a>
        </span>
      </footer>
    </div>
  `;

  const $ = <T extends HTMLElement>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`missing ${sel}`);
    return el;
  };

  const startBtn = $<HTMLButtonElement>('#start');
  const stopBtn = $<HTMLButtonElement>('#stop');
  const statusEl = $<HTMLSpanElement>('#status');
  const badgeEl = $<HTMLSpanElement>('#badge');
  const meterFill = $<HTMLDivElement>('#meter > .fill');
  const canvas = $<HTMLCanvasElement>('#spectrogram');

  const delayInput = $<HTMLInputElement>('#delay');
  const pitchInput = $<HTMLInputElement>('#pitch');
  const hpfInput = $<HTMLInputElement>('#hpf');
  const lpfInput = $<HTMLInputElement>('#lpf');
  const mixInput = $<HTMLInputElement>('#mix');
  const outInput = $<HTMLInputElement>('#out');

  const spectralModesEl = $<HTMLDivElement>('#spectral-modes');
  const freezeNowBtn = $<HTMLButtonElement>('#freeze-now');
  const releaseBtn = $<HTMLButtonElement>('#release-spectrum');

  function applySpectralMode(mode: SpectralMode): void {
    params.spectralMode = mode;
    engine.setSpectralMode(mode);
    spectralModesEl.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b.dataset['spectral'] === mode);
    });
    freezeNowBtn.disabled = mode !== 'freeze';
    releaseBtn.disabled = mode !== 'freeze';
    persist();
  }

  spectralModesEl.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
    b.addEventListener('click', () => {
      const m = b.dataset['spectral'] as SpectralMode | undefined;
      if (m) applySpectralMode(m);
    });
  });
  freezeNowBtn.addEventListener('click', () => engine.freezeSpectrum());
  releaseBtn.addEventListener('click', () => engine.releaseSpectrum());

  const presetsEl = $<HTMLDivElement>('#presets');
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.dataset['preset'] = p.id;
    b.innerHTML = `<span class="name">${p.name}</span><span class="hint">${p.hint}</span>`;
    b.addEventListener('click', () => applyPreset(p));
    presetsEl.appendChild(b);
  }

  function renderInputs(): void {
    delayInput.value = String(params.delaySeconds);
    pitchInput.value = String(params.pitchRatio);
    hpfInput.value = String(params.highpassHz);
    lpfInput.value = String(params.lowpassHz);
    mixInput.value = String(params.dryWet);
    outInput.value = String(params.outputGain);
    renderValues();
  }
  function renderValues(): void {
    setValueDisplay('#ctl-delay', FMT.seconds(params.delaySeconds));
    setValueDisplay('#ctl-pitch', FMT.ratio(params.pitchRatio));
    setValueDisplay('#ctl-hpf', FMT.hz(params.highpassHz));
    setValueDisplay('#ctl-lpf', FMT.hz(params.lowpassHz));
    setValueDisplay('#ctl-mix', FMT.pct(params.dryWet));
    setValueDisplay('#ctl-out', FMT.pct(params.outputGain));
  }
  function setValueDisplay(parentSel: string, text: string): void {
    const el = root.querySelector<HTMLSpanElement>(`${parentSel} .value`);
    if (el) el.textContent = text;
  }

  function applyPreset(p: Preset): void {
    params = { ...params, ...p.params };
    activePresetId = p.id;
    renderInputs();
    pushAllParamsToEngine();
    persist();
    updatePresetHighlights();
  }
  function updatePresetHighlights(): void {
    presetsEl.querySelectorAll('button').forEach((b) => {
      const id = b.dataset['preset'];
      b.classList.toggle('active', id === activePresetId);
    });
  }

  function pushAllParamsToEngine(): void {
    if (engine.getState() !== 'running') return;
    engine.setDelaySeconds(params.delaySeconds);
    engine.setPitchRatio(params.pitchRatio);
    engine.setHighpassHz(params.highpassHz);
    engine.setLowpassHz(params.lowpassHz);
    engine.setDryWet(params.dryWet);
    engine.setOutputGain(params.outputGain);
    engine.setSpectralMode(params.spectralMode);
  }

  delayInput.addEventListener('input', () => {
    params.delaySeconds = parseFloat(delayInput.value);
    engine.setDelaySeconds(params.delaySeconds);
    renderValues();
    activePresetId = null;
    updatePresetHighlights();
    persist();
  });
  pitchInput.addEventListener('input', () => {
    params.pitchRatio = parseFloat(pitchInput.value);
    engine.setPitchRatio(params.pitchRatio);
    renderValues();
    activePresetId = null;
    updatePresetHighlights();
    persist();
  });
  hpfInput.addEventListener('input', () => {
    params.highpassHz = parseFloat(hpfInput.value);
    engine.setHighpassHz(params.highpassHz);
    renderValues();
    activePresetId = null;
    updatePresetHighlights();
    persist();
  });
  lpfInput.addEventListener('input', () => {
    params.lowpassHz = parseFloat(lpfInput.value);
    engine.setLowpassHz(params.lowpassHz);
    renderValues();
    activePresetId = null;
    updatePresetHighlights();
    persist();
  });
  mixInput.addEventListener('input', () => {
    params.dryWet = parseFloat(mixInput.value);
    engine.setDryWet(params.dryWet);
    renderValues();
    persist();
  });
  outInput.addEventListener('input', () => {
    params.outputGain = parseFloat(outInput.value);
    engine.setOutputGain(params.outputGain);
    renderValues();
    persist();
  });

  function persist(): void {
    savePrefs(params);
  }

  function updateStatus(state: string, info?: string): void {
    statusEl.textContent = info ? `${state} — ${info}` : state;
    statusEl.classList.remove('ok', 'warn', 'err');
    if (state === 'running') statusEl.classList.add('ok');
    if (state === 'starting') statusEl.classList.add('warn');
    if (state === 'error') statusEl.classList.add('err');
    badgeEl.textContent = state === 'running' ? 'mic: live' : `mic: ${state}`;
    startBtn.classList.toggle('hidden', state === 'running' || state === 'starting');
    stopBtn.classList.toggle('hidden', state !== 'running' && state !== 'starting');
    startBtn.disabled = state === 'starting';
  }

  function updateMeter(rms: number): void {
    const db = 20 * Math.log10(rms + 1e-9);
    const norm = Math.max(0, Math.min(1, (db + 60) / 60));
    meterFill.style.width = `${(norm * 100).toFixed(1)}%`;
  }

  startBtn.addEventListener('click', async () => {
    try {
      await engine.start(params);
      const an = engine.getAnalyser();
      if (an) {
        spectro = new Spectrogram({ canvas, analyser: an });
        spectro.start();
        window.addEventListener('resize', () => spectro?.resize());
      }
      pushAllParamsToEngine();
    } catch (err) {
      statusEl.textContent = `error: ${err instanceof Error ? err.message : err}`;
      statusEl.classList.add('err');
    }
  });

  stopBtn.addEventListener('click', () => {
    spectro?.stop();
    spectro = null;
    void engine.stop();
    meterFill.style.width = '0%';
  });

  mountAnalysisPanel($<HTMLElement>('#analysis-card'), engine);

  renderInputs();
  applySpectralMode(params.spectralMode);
  updateStatus('idle');
}
