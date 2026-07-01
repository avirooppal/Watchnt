let mediaRecorder = null;
let audioChunks = [];

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'OFFSCREEN_START_RECORDING') {
    startRecording(message.payload.streamId);
  } else if (message.type === 'OFFSCREEN_STOP_RECORDING') {
    stopRecording();
  }
});

async function startRecording(streamId) {
  if (mediaRecorder) return;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });
    
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await uploadAudio(audioBlob);
      audioChunks = [];
      mediaRecorder = null;
    };
    
    mediaRecorder.start();
  } catch (err) {
    console.error('Failed to start recording:', err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    // Stop all tracks
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
}

async function uploadAudio(blob) {
  try {
    // 1. Create meeting
    const meetingRes = await fetch('http://localhost:8000/meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Meeting ' + new Date().toLocaleString() })
    });
    const meeting = await meetingRes.json();
    
    // 2. Upload Audio
    const formData = new FormData();
    formData.append('meeting_id', meeting.id);
    formData.append('file', blob, 'audio.webm');
    
    const uploadRes = await fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData
    });
    
    // Send background success and the meeting id to start polling
    chrome.runtime.sendMessage({ 
      type: 'RECORDING_UPLOADED', 
      payload: { meetingId: meeting.id } 
    });
  } catch (err) {
    console.error('Upload failed:', err);
    chrome.runtime.sendMessage({ type: 'RECORDING_UPLOAD_FAILED' });
  }
}
