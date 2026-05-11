// Type declarations for the AudioWorklet global scope.
// See https://www.w3.org/TR/webaudio/#AudioWorkletGlobalScope.
// Not in lib.dom or lib.webworker by default; we declare what we use.

declare const sampleRate: number;
declare const currentTime: number;
declare const currentFrame: number;

interface AudioParamDescriptor {
  name: string;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
  automationRate?: 'a-rate' | 'k-rate';
}

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: object);
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processor: new (options?: object) => AudioWorkletProcessor,
): void;
