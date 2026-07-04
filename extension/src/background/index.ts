chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html#/onboarding') });
  }
});

chrome.runtime.onMessage.addListener((message: any, _sender: any, _sendResponse: any) => {
  if (message.type === 'START_RECORDING_WITH_STREAM') {
    startRecording();
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
  } else if (message.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
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
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.error("Polling failed:", err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function startRecording() {
  chrome.storage.local.set({ isRecording: true, pipelineStatus: 'RECORDING' });
  chrome.action.setBadgeText({ text: 'REC' });
  chrome.action.setBadgeBackgroundColor({ color: '#dc2626' }); // red
}

async function stopRecording() {
  chrome.storage.local.set({ isRecording: false, isUploading: true, pipelineStatus: 'UPLOADING' });
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
}
