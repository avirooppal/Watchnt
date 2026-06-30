
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
    chrome.storage.local.set({ isUploading: false });
    triggerAiPipeline(message.payload.meetingId);
    chrome.offscreen.closeDocument();
  } else if (message.type === 'RECORDING_UPLOAD_FAILED') {
    chrome.storage.local.set({ isUploading: false });
    chrome.offscreen.closeDocument();
  }
});

async function triggerAiPipeline(meetingId: string) {
  try {
    // Transcribe
    await fetch(`http://localhost:8000/transcribe/${meetingId}`, { method: 'POST' });
    // Summary & Actions
    await Promise.all([
      fetch(`http://localhost:8000/summary/${meetingId}`, { method: 'POST' }),
      fetch(`http://localhost:8000/actions/${meetingId}`, { method: 'POST' })
    ]);
    console.log("AI pipeline complete for", meetingId);
  } catch (err) {
    console.error("AI pipeline failed:", err);
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
  
  chrome.storage.local.set({ isRecording: true });
  
  chrome.action.setBadgeText({ text: 'REC' });
  chrome.action.setBadgeBackgroundColor({ color: '#dc2626' }); // red
}

async function stopRecording() {
  // Always attempt to stop the offscreen document, even if the service worker 
  // just woke up and its memory state is reset.
  chrome.runtime.sendMessage({
    type: 'OFFSCREEN_STOP_RECORDING'
  });
  
  chrome.storage.local.set({ isRecording: false, isUploading: true });
  
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
}
