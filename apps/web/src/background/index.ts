import { resolveBestProvider } from '@watchnt/capture';

// Initialize background worker
console.log('WatchNT Background Worker Initialized');

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture-page',
    title: 'Capture with WatchNT',
    contexts: ['page', 'video', 'audio']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'capture-page' && tab?.id) {
    // Forward capture intent to content script to analyze DOM
    chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_PAGE_FOR_CAPTURE' });
  }
});

chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  if (command === 'start-capture') {
    // Trigger capture flow on active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'ANALYZE_PAGE_FOR_CAPTURE' });
      }
    });
  } else if (command === 'open-watchnt') {
    // Open the Library/Recall mode in a full tab
    const url = chrome.runtime.getURL('index.html');
    chrome.tabs.create({ url });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_PIPELINE_JOB') {
    console.log('Starting pipeline job for source:', message.source);
    // Here we would interact with @watchnt/pipeline to start processing
    sendResponse({ success: true });
  }
});
