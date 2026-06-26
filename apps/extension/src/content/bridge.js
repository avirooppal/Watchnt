window.addEventListener('message', (event) => {
  if (event.source === window && event.data && event.data.source === 'watchnt-page') {
    chrome.runtime.sendMessage(event.data);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  window.postMessage({ ...message, source: 'watchnt-extension' }, '*');
  return true;
});
