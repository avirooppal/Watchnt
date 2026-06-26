export class AudioBuffer {
  private chunks: Blob[] = [];

  addChunk(chunk: Blob) {
    this.chunks.push(chunk);
  }

  clear() {
    this.chunks = [];
  }

  getBlob(): Blob {
    return new Blob(this.chunks, { type: 'audio/webm;codecs=opus' });
  }

  get length(): number {
    return this.chunks.length;
  }
}
