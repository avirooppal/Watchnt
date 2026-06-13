import { getConfig } from '../storage/local.js';
import { MESSAGE_TYPES } from '../shared/constants.js';

async function init() {
  const config = await getConfig();

  if (!config.apiHost || !config.llmProvider) {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') });
  }

  document.getElementById('enable-overlay-btn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    chrome.runtime.sendMessage({ type: 'INJECT_OVERLAY', tabId: tab.id });
    window.close();
  });

  document.getElementById('open-dashboard-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') });
    window.close();
  });
}

document.addEventListener('DOMContentLoaded', init);
