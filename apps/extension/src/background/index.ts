chrome.runtime.onInstalled.addListener(() => {
  console.log("Watchn't AI Copilot installed");
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message in background:", message);
  if (message.type === 'PING') {
    sendResponse({ status: 'OK' });
  }
  return true;
});
