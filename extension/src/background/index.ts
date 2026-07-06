chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html#/onboarding') });
  }
});

// Resume polling if service worker wakes up and pipeline is active
chrome.storage.local.get(['pipelineStatus', 'isUploading', 'currentMeetingId'], (res: any) => {
  if (res.isUploading && res.pipelineStatus !== 'COMPLETED' && res.pipelineStatus !== 'FAILED' && res.currentMeetingId) {
    pollPipelineStatus(res.currentMeetingId);
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
    chrome.storage.local.set({ currentMeetingId: message.payload.meetingId });
    pollPipelineStatus(message.payload.meetingId);
  } else if (message.type === 'PROCESS_TRANSCRIPT') {
    handleProcessTranscript(message.payload.transcript);
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

async function handleProcessTranscript(transcript: any[]) {
  try {
    const createRes = await fetch('http://localhost:8000/meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Google Meet - ' + new Date().toLocaleString() })
    });
    if (!createRes.ok) throw new Error('Failed to create meeting');
    
    const meetingData = await createRes.json();
    const meetingId = meetingData.id;

    const formData = new FormData();
    formData.append('meeting_id', meetingId);
    formData.append('transcript_json', JSON.stringify(transcript));
    
    const res = await fetch('http://localhost:8000/upload_transcript', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload transcript');
    
    const data = await res.json();
    chrome.storage.local.set({ currentMeetingId: data.meeting_id });
    pollPipelineStatus(data.meeting_id);
  } catch (e) {
    console.error("Failed to upload transcript:", e);
    chrome.storage.local.set({ isUploading: false, pipelineStatus: 'FAILED' });
  }
}
