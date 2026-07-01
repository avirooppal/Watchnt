chrome.runtime.onMessage.addListener((message: any, _sender: any, _sendResponse: any) => {
  if (message.type === 'START_RECORDING_WITH_STREAM') {
    startOffscreenRecording(message.payload.streamId);
  } else if (message.type === 'STOP_RECORDING') {
    stopRecording();
  } else if (message.type === 'MEETING_DETECTED') {
    chrome.storage.local.set({ meetingDetected: true });
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
  } else if (message.type === 'RECORDING_UPLOADED') {
    pollPipelineStatus(message.payload.meetingId);
  } else if (message.type === 'RECORDING_UPLOAD_FAILED') {
    chrome.storage.local.set({ isUploading: false, pipelineStatus: 'FAILED' });
    chrome.offscreen.closeDocument();
  }
});

async function pollPipelineStatus(meetingId: string) {
  let isDone = false;
  
  while (!isDone) {
    try {
      const res = await fetch(`http://localhost:8000/meeting/${meetingId}/status`);
      const data = await res.json();
      
      chrome.storage.local.set({ pipelineStatus: data.status });
      
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        isDone = true;
        chrome.storage.local.set({ isUploading: false });
        try {
          await chrome.offscreen.closeDocument();
        } catch (e) {
          // might already be closed
        }
      } else {
        // Wait 2 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.error("Polling failed:", err);
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function startOffscreenRecording(streamId: string) {
  const hasDocument = await chrome.offscreen.hasDocument();
  if (!hasDocument) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: 'Recording meeting audio'
    });
  }
  
  chrome.runtime.sendMessage({
    type: 'OFFSCREEN_START_RECORDING',
    payload: { streamId }
  });
  
  chrome.storage.local.set({ isRecording: true, pipelineStatus: 'RECORDING' });
  
  chrome.action.setBadgeText({ text: 'REC' });
  chrome.action.setBadgeBackgroundColor({ color: '#dc2626' }); // red
}

async function stopRecording() {
  chrome.runtime.sendMessage({
    type: 'OFFSCREEN_STOP_RECORDING'
  });
  
  chrome.storage.local.set({ isRecording: false, isUploading: true, pipelineStatus: 'UPLOADING' });
  
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
}
