import { PLATFORMS, MESSAGE_TYPES } from '../shared/constants.js';

export function readVideoMetadata() {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v') || null;

  const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') || document.querySelector('h1.ytd-watch-metadata');
  const title = titleEl ? titleEl.textContent.trim() : null;

  const channelEl = document.querySelector('ytd-channel-name yt-formatted-string a') || document.querySelector('ytd-channel-name yt-formatted-string');
  const channel = channelEl ? channelEl.textContent.trim() : null;

  return {
    platform: PLATFORMS.YOUTUBE,
    videoId,
    title,
    channel,
    url: window.location.href
  };
}

export async function waitForTranscriptPanel() {
  return new Promise((resolve) => {
    const existingPanel = document.querySelector('ytd-transcript-renderer');
    if (existingPanel) {
      return resolve(existingPanel);
    }

    const observer = new MutationObserver((mutations) => {
      const panel = document.querySelector('ytd-transcript-renderer');
      if (panel) {
        observer.disconnect();
        resolve(panel);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 30000);
  });
}

export function collectTranscriptSegments(transcriptEl) {
  const segments = transcriptEl.querySelectorAll('ytd-transcript-segment-renderer');
  return Array.from(segments).map(segment => {
    const timeEl = segment.querySelector('.segment-timestamp');
    const textEl = segment.querySelector('.segment-text');
    
    let startTime = 0;
    if (timeEl) {
      const timeStr = timeEl.textContent.trim();
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 3) {
        startTime = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        startTime = parts[0] * 60 + parts[1];
      }
    }
    
    const text = textEl ? textEl.textContent.trim() : '';
    
    return { startTime, text };
  });
}

let transcriptInterval = null;
let sentSegments = new Set();

export async function startCapture() {
  const metadata = readVideoMetadata();
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.TRANSCRIPT_CHUNK,
    phase: 'start',
    metadata
  });

  const videoEl = document.querySelector('video');
  if (videoEl) {
    videoEl.addEventListener('ended', () => {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.VIDEO_ENDED });
      if (transcriptInterval) clearInterval(transcriptInterval);
    });
  }

  const transcriptPanel = await waitForTranscriptPanel();
  if (!transcriptPanel) return;

  transcriptInterval = setInterval(() => {
    const segments = collectTranscriptSegments(transcriptPanel);
    const newSegments = segments.filter(s => !sentSegments.has(s.startTime));
    
    if (newSegments.length > 0) {
      newSegments.forEach(s => sentSegments.add(s.startTime));
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.TRANSCRIPT_CHUNK,
        segments: newSegments
      });
    }
  }, 10000);
}

startCapture();
