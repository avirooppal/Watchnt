
export class WAVEncoder {
    static encode(audioData: Float32Array, sampleRate: number): ArrayBuffer {
        const buffer = new ArrayBuffer(44 + audioData.length * 2);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + audioData.length * 2, true);
        this.writeString(view, 8, 'WAVE');

        // fmt sub-chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
        view.setUint16(22, 1, true); // NumChannels (1)
        view.setUint32(24, sampleRate, true); // SampleRate
        view.setUint32(28, sampleRate * 2, true); // ByteRate
        view.setUint16(32, 2, true); // BlockAlign
        view.setUint16(34, 16, true); // BitsPerSample

        // data sub-chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, audioData.length * 2, true);

        // Write PCM samples
        let offset = 44;
        for (let i = 0; i < audioData.length; i++) {
            let s = Math.max(-1, Math.min(1, audioData[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        return buffer;
    }

    private static writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}
