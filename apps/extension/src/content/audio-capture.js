const MESSAGE_TYPES = { AUDIO_CHUNK: 'AUDIO_CHUNK', VIDEO_ENDED: 'VIDEO_ENDED' };

let mediaRecorder = null;
let audioInterval = null;
let stream = null;

async function startAudioCapture() {
  try {
    stream = await new Promise((resolve, reject) => {
      chrome.tabCapture.capture({ audio: true, video: false }, (s) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(s);
      });
    });

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    let audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    const sendChunks = () => {
      if (audioChunks.length === 0) return;
      const blob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
      audioChunks = [];
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.AUDIO_CHUNK,
          audio: base64data,
          mimeType: 'audio/webm',
          durationSec: 60
        });
      };
      reader.readAsDataURL(blob);
    };

    audioInterval = setInterval(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.requestData();
        sendChunks();
      }
    }, 60000);

    mediaRecorder.onstop = () => {
      sendChunks();
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.VIDEO_ENDED });
    };

    mediaRecorder.start();
  } catch (err) {
    console.error('[Watchnt] Audio capture failed:', err);
  }
}

function stopAudioCapture() {
  if (audioInterval) clearInterval(audioInterval);
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

window.__watchnt = { startAudioCapture, stopAudioCapture };
