let mediaRecorder = null;
let audioChunks = [];
let mediaStreams = [];

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
    const tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });

    let micStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.warn("Microphone not available or permission denied:", e);
    }

    mediaStreams = [tabStream];
    let finalStream = tabStream;

    if (micStream) {
      mediaStreams.push(micStream);
      
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();

      // Pan Tab audio to Left (-1)
      const tabSource = audioCtx.createMediaStreamSource(tabStream);
      const tabPanner = audioCtx.createStereoPanner();
      tabPanner.pan.value = -1;
      tabSource.connect(tabPanner).connect(dest);

      // Pan Mic audio to Right (1)
      const micSource = audioCtx.createMediaStreamSource(micStream);
      const micPanner = audioCtx.createStereoPanner();
      micPanner.pan.value = 1;
      micSource.connect(micPanner).connect(dest);

      finalStream = dest.stream;
    }
    
    mediaRecorder = new MediaRecorder(finalStream, { mimeType: 'audio/webm' });
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
  }
  mediaStreams.forEach(stream => {
    stream.getTracks().forEach(track => track.stop());
  });
  mediaStreams = [];
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
