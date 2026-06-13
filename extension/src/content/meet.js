import { PLATFORMS, MESSAGE_TYPES } from '../shared/constants.js';

export function readMeetMetadata() {
  return {
    platform: PLATFORMS.MEET,
    title: document.title,
    url: window.location.href,
    channel: null
  };
}

let captionBuffer = [];
let bufferInterval = null;
let currentMeetUrl = window.location.href;

let meetObserver = null;

export function startMeetCapture() {
  const metadata = readMeetMetadata();
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.TRANSCRIPT_CHUNK,
    phase: 'start',
    metadata
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const textContent = node.textContent.trim();
            if (textContent) {
              const captionContainer = document.querySelector('div[jsname="tgaKEf"]');
              if (captionContainer && captionContainer.contains(node)) {
                captionBuffer.push(textContent);
              } else if (node.className && typeof node.className === 'string' && node.className.includes('iTTPOb')) {
                captionBuffer.push(textContent);
              }
            }
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  meetObserver = observer;

  bufferInterval = setInterval(() => {
    if (captionBuffer.length > 0) {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.TRANSCRIPT_CHUNK,
        text: captionBuffer.join(' ')
      });
      captionBuffer = [];
    }
  }, 10000);
}

export function stopMeetCapture() {
  if (meetObserver) {
    meetObserver.disconnect();
    meetObserver = null;
  }
  if (bufferInterval) {
    clearInterval(bufferInterval);
    bufferInterval = null;
  }
  
  if (captionBuffer.length > 0) {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.TRANSCRIPT_CHUNK,
      text: captionBuffer.join(' ')
    });
    captionBuffer = [];
  }
  
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.VIDEO_ENDED });
}

window.addEventListener('WATCHNT_MEET_START', () => {
  startMeetCapture();
});

window.addEventListener('WATCHNT_MEET_STOP', () => {
  stopMeetCapture();
});
