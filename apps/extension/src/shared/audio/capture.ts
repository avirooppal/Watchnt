export type AudioChunkHandler = (chunk: Blob, timestamp: number) => void;

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private onChunk: AudioChunkHandler | null = null;
  private timesliceMs: number;

  constructor(timesliceMs: number = 10000) {
    this.timesliceMs = timesliceMs;
  }

  async startTabCapture(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
        if (!stream) {
          return reject(new Error(chrome.runtime.lastError?.message || 'Tab capture failed'));
        }
        this.stream = stream;
        this.setupRecorder();
        resolve();
      });
    });
  }

  async startMicCapture(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.setupRecorder();
    } catch (err) {
      console.error('Microphone capture failed', err);
      throw err;
    }
  }

  private setupRecorder() {
    if (!this.stream) return;
    
    // Play the stream back locally so the user can still hear the tab (if it's tab capture)
    // For a real extension, we'd only do this for tab capture, not mic capture.
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(this.stream);
    source.connect(audioCtx.destination);

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm;codecs=opus' });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.onChunk) {
        this.onChunk(event.data, Date.now());
      }
    };

    this.mediaRecorder.start(this.timesliceMs);
  }

  onData(handler: AudioChunkHandler) {
    this.onChunk = handler;
  }

  pause() {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resume() {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}
