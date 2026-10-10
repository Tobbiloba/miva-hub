/**
 * Streaming downsampler for microphone audio. The mic is captured at the
 * device's own rate (44.1/48kHz; asking an AudioContext for 16kHz isn't
 * honoured everywhere and Firefox refuses to mix rates), then each output
 * sample averages the input samples it covers, which also filters out most
 * of the high frequencies that would alias. Leftover samples carry over to
 * the next chunk, so chunk boundaries don't click.
 */
export class PcmDownsampler {
  readonly outRate: number;
  private readonly ratio: number;
  private pending = new Float32Array(0);
  /** Fractional read position into `pending` */
  private pos = 0;

  constructor(inRate: number, outRate: number) {
    // Never upsample: a device slower than the target is sent as is
    this.outRate = Math.min(inRate, outRate);
    this.ratio = inRate / this.outRate;
  }

  process(input: Float32Array): Float32Array {
    if (this.ratio === 1) return input.slice();
    const buf = new Float32Array(this.pending.length + input.length);
    buf.set(this.pending);
    buf.set(input, this.pending.length);

    const count = Math.floor((buf.length - this.pos) / this.ratio);
    const out = new Float32Array(count);
    let pos = this.pos;
    for (let i = 0; i < count; i++) {
      const start = Math.floor(pos);
      const end = Math.floor(pos + this.ratio);
      let sum = 0;
      for (let j = start; j < end; j++) sum += buf[j];
      out[i] = sum / (end - start);
      pos += this.ratio;
    }
    const keepFrom = Math.floor(pos);
    this.pending = buf.slice(keepFrom);
    this.pos = pos - keepFrom;
    return out;
  }
}

/**
 * AudioWorklet that hands raw mic frames to the main thread in ~85ms
 * batches (it gets 128 samples per call). Loaded from a Blob URL so there's
 * no extra file to serve.
 */
export const CAPTURE_WORKLET_SOURCE = `
class AsklyCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(4096);
    this.length = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.length++] = channel[i];
        if (this.length === this.buffer.length) {
          this.port.postMessage(this.buffer, [this.buffer.buffer]);
          this.buffer = new Float32Array(4096);
          this.length = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("askly-capture", AsklyCapture);
`;

/** Add the capture worklet to a context and return a node reading the mic. */
export async function createCaptureNode(
  ctx: AudioContext,
): Promise<AudioWorkletNode> {
  const url = URL.createObjectURL(
    new Blob([CAPTURE_WORKLET_SOURCE], { type: "text/javascript" }),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // A browser that can't run the worklet would otherwise leave the
    // session stuck on "connecting"; fail clearly instead
    await Promise.race([
      ctx.audioWorklet.addModule(url),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Your browser couldn't start the microphone. Try updating it, or use Chrome.",
              ),
            ),
          10_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
    URL.revokeObjectURL(url);
  }
  return new AudioWorkletNode(ctx, "askly-capture", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 1,
  });
}
