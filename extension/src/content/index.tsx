
import { createRoot } from 'react-dom/client';
import { Bot } from './Bot';
import type { PlatformHandler } from './base';
import { GoogleMeetHandler } from './googleMeet';
import '../index.css';

console.log("WatchNT: Content script loaded! Injecting Bot UI...");

// Additional platform handlers like Zoom, Teams would be added here
const handlers = [
  new GoogleMeetHandler()
];

function detectPlatform(): PlatformHandler | null {
  const url = window.location.href;
  if (url.includes('meet.google.com')) {
    return handlers[0];
  }
  return null;
}

let hasNotifiedBackground = false;

function checkForMeeting() {
  const handler = detectPlatform();
  if (handler && handler.isMeetingActive()) {
    if (!hasNotifiedBackground) {
      chrome.runtime.sendMessage({ 
        type: 'MEETING_DETECTED',
        payload: {
          platform: handler.getPlatformName(),
          title: handler.getMeetingTitle()
        }
      });
      hasNotifiedBackground = true;
      mountBot();
    }
  } else {
    hasNotifiedBackground = false;
    unmountBot();
  }
}

// Poll every 5 seconds to see if a meeting started
setInterval(checkForMeeting, 5000);
checkForMeeting();

let rootElement: HTMLElement | null = null;
let reactRoot: ReturnType<typeof createRoot> | null = null;

function mountBot() {
  console.log("WatchNT: Attempting to mount bot...");
  if (document.getElementById('watchnt-bot-root')) {
    console.log("WatchNT: Bot already mounted.");
    return;
  }

  console.log("WatchNT: Creating bot root element...");
  rootElement = document.createElement('div');
  rootElement.id = 'watchnt-bot-root';
  document.body.appendChild(rootElement);

  try {
    reactRoot = createRoot(rootElement);
    reactRoot.render(<Bot />);
    console.log("WatchNT: Bot mounted successfully!");
  } catch (err) {
    console.error("WatchNT: Failed to mount bot React app:", err);
  }
}

function unmountBot() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  if (rootElement) {
    rootElement.remove();
    rootElement = null;
  }
}
