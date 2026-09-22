// Eight-second independently decodable PCM windows. Flush the tail on stop.
class PCMWindow extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.channels = options.processorOptions.channels;
    this.frames = 16000 * 8;
    this.buffer = new Float32Array(this.frames * this.channels);
    this.cursor = 0;
    this.port.onmessage = () => {
      this.flush();
      this.port.postMessage({ flushed: true });
    };
  }
  flush() {
    if (this.cursor) {
      const data = this.buffer.slice(0, this.cursor);
      this.port.postMessage({ pcm: data.buffer }, [data.buffer]);
      this.cursor = 0;
    }
  }
  process(inputs) {
    const input = inputs[0];
    if (!input?.length) return true;
    for (let i = 0; i < input[0].length; i++) {
      for (let c = 0; c < this.channels; c++)
        this.buffer[this.cursor++] = input[c]?.[i] || 0;
      if (this.cursor === this.buffer.length) this.flush();
    }
    return true;
  }
}
registerProcessor("pcm-window", PCMWindow);
