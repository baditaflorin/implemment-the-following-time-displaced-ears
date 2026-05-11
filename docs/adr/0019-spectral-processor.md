# 19. Spectral processor (STFT in an AudioWorklet)

- Status: accepted
- Date: 2026-05-11

## Context

The original brief mentioned "WebGPU FFT" as part of the toolkit. In practice, WebGPU compute shaders for short-time FFTs of audio-sized blocks (1024–4096 samples) are the wrong shape of tool: the GPU pipeline adds 10–50 ms of jitter to the audio thread, the parallelism speedup is not meaningful at these sizes (a 1024-point radix-2 FFT in JS takes ~100 µs), and the developer cost (compute shader, bind groups, buffer staging) is high. WebGPU shines when the input is a static texture or a multi-megabyte buffer; per-quantum audio is neither.

What the brief was _really_ asking for is **FFT-based audio experiments** — spectral effects the user can hear. Those run best in an AudioWorklet on the audio thread, using a small hand-rolled FFT.

## Decision

Ship a single new AudioWorklet — `spectral.worklet.ts` — that implements an STFT pipeline with three modes:

| Mode     | What it does                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `bypass` | input passes through unchanged (channel copy, no FFT)                                                                                       |
| `freeze` | captures the current frame's magnitudes on a trigger, then emits them indefinitely with each bin's phase advancing at its natural frequency |
| `smear`  | low-pass filters magnitudes across frames (exponential smoothing, α = 0.85), creating drone-like sustain without losing transients entirely |

The processor sits **after** the granular pitch shifter in the audio graph. That order is deliberate: `freeze + ratio=0.25` lets the user freeze a pitched-down moment of audio, which is more interesting than either effect alone.

## FFT details

- **Size:** 1024 samples. At 48 kHz that's a 21 ms frame — enough frequency resolution (47 Hz/bin) to be musical, low enough latency to feel realtime.
- **Hop:** 512 (50% overlap).
- **Window:** sqrt-periodic-Hann, applied on both analysis and synthesis. This satisfies the COLA (constant overlap-add) property at 50% overlap exactly — see `tests/unit/fft.test.ts` for the unit test that pins this.
- **FFT implementation:** in-place radix-2 Cooley–Tukey in `src/audio/lib/fft.ts`. Imported by both the worklet and the unit test. ~80 lines.

## Why not WebGPU

See "Context" above. If a future feature needs FFTs on multi-second buffers (e.g. a "render the whole 7-second delay buffer as a heat-map") then WebGPU becomes attractive. For per-quantum audio: AudioWorklet + JS FFT wins.

## Hermitian symmetry

The output of `fft` on a real-valued input is Hermitian (X[k] = conj(X[N-k])). When we modify the spectrum (freeze / smear), we explicitly restore Hermitian symmetry before `ifft` so the output stays real. Otherwise the ifft would leak a small imaginary component, audible as a slight detune.

## Configuration

The worklet's mode and behavior can be set either via:

- **Port messages** (`{ type: 'mode', mode: N }`, `{ type: 'freeze' }`, `{ type: 'release' }`) — used by the UI in realtime.
- **`processorOptions`** (`{ mode, autoFreeze }`) — used by the OfflineAudioContext DSP regression test, because port messages don't reliably flush during synchronous offline rendering.

## Latency budget

Added by this stage: 21 ms (one FFT frame). Total app latency in the worst case (`freeze` mode + 7s delay + 80 ms grain) is dominated by the delay; the spectral processor's contribution is negligible.
