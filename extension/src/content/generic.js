import { PLATFORMS, MESSAGE_TYPES } from '../shared/constants.js';

export function findCaptionTrack() {
  const track = document.querySelector('track[kind="captions"], track[kind="subtitles"]');
  return track || null;
}

export function readTrackCues(trackEl) {
  if (!trackEl.track || !trackEl.track.cues) return [];
  return Array.from(trackEl.track.cues).map(cue => ({
    startTime: cue.startTime,
    endTime: cue.endTime,
    text: cue.text
  }));
}

let ariaBuffer = [];

export function observeAriaLive() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) ariaBuffer.push(text);
          }
        }
      } else if (mutation.type === 'characterData') {
        const text = mutation.target.textContent.trim();
        if (text) ariaBuffer.push(text);
      }
    }
  });

  const polite = document.querySelectorAll('[aria-live="polite"]');
  const assertive = document.querySelectorAll('[aria-live="assertive"]');

  [...polite, ...assertive].forEach(el => {
    observer.observe(el, { childList: true, subtree: true, characterData: true });
  });

  setInterval(() => {
    if (ariaBuffer.length > 0) {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.TRANSCRIPT_CHUNK,
        text: ariaBuffer.join(' ')
      });
      ariaBuffer = [];
    }
  }, 30000);
}

export function startGenericCapture() {
  const metadata = {
    platform: PLATFORMS.PODCAST,
    title: document.title,
    channel: null,
    url: window.location.href
  };

  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.TRANSCRIPT_CHUNK,
    phase: 'start',
    metadata
  });

  const track = findCaptionTrack();
  if (track) {
    const existingCues = readTrackCues(track);
    if (existingCues.length > 0) {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.TRANSCRIPT_CHUNK,
        segments: existingCues
      });
    }

    track.addEventListener('cuechange', () => {
      const cues = readTrackCues(track);
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.TRANSCRIPT_CHUNK,
        segments: cues
      });
    });
  } else {
    observeAriaLive();
  }

  window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.VIDEO_ENDED });
  });
}

startGenericCapture();
