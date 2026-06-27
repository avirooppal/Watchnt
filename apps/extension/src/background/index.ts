const API_URL = "http://localhost:8000/api/v1";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Watchn't AI Copilot installed");
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

async function uploadAudioChunk(meetingId: string, chunk: Blob) {
  const formData = new FormData();
  formData.append("audio", chunk, `chunk_${Date.now()}.webm`);
  
  try {
    const response = await fetch(`${API_URL}/meetings/${meetingId}/audio`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    console.log("Chunk uploaded successfully:", data);
  } catch (error) {
    console.error("Failed to upload audio chunk", error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message in background:", message);
  if (message.type === 'PING') {
    sendResponse({ status: 'OK' });
  } else if (message.type === 'AUDIO_CHUNK') {
    uploadAudioChunk(message.meetingId, message.blob)
      .then(() => sendResponse({ status: 'UPLOADED' }))
      .catch((e) => sendResponse({ status: 'ERROR', error: e.message }));
    return true; // Keep message channel open for async response
  }
  return true;
});
