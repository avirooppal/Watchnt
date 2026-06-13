import { MESSAGE_TYPES } from '../shared/constants.js';

let isListening = false;
let overlayBtn = null;

function injectOverlay() {
  if (document.getElementById('watchnt-overlay')) return;

  const container = document.createElement('div');
  container.id = 'watchnt-overlay';
  container.style.position = 'fixed';
  container.style.bottom = '24px';
  container.style.right = '24px';
  container.style.zIndex = '999999';

  overlayBtn = document.createElement('button');
  
  // Basic styles
  overlayBtn.style.display = 'flex';
  overlayBtn.style.alignItems = 'center';
  overlayBtn.style.gap = '8px';
  overlayBtn.style.backgroundColor = 'rgba(24, 24, 27, 0.85)';
  overlayBtn.style.backdropFilter = 'blur(12px)';
  overlayBtn.style.webkitBackdropFilter = 'blur(12px)';
  overlayBtn.style.color = '#ffffff';
  overlayBtn.style.border = '1px solid rgba(255,255,255,0.1)';
  overlayBtn.style.borderRadius = '32px';
  overlayBtn.style.padding = '12px 20px';
  overlayBtn.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  overlayBtn.style.fontSize = '14px';
  overlayBtn.style.fontWeight = '600';
  overlayBtn.style.cursor = 'pointer';
  overlayBtn.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
  overlayBtn.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  
  const iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polygon points="10 8 16 12 10 16 10 8"></polygon>
  </svg>`;
  
  overlayBtn.innerHTML = `${iconSvg} <span>Capture with Watchn't</span>`;

  overlayBtn.addEventListener('mouseenter', () => {
    overlayBtn.style.transform = 'translateY(-4px) scale(1.02)';
    overlayBtn.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.4)';
    overlayBtn.style.borderColor = 'rgba(99, 102, 241, 0.5)';
  });
  
  overlayBtn.addEventListener('mouseleave', () => {
    overlayBtn.style.transform = 'translateY(0) scale(1)';
    overlayBtn.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
    overlayBtn.style.borderColor = 'rgba(255,255,255,0.1)';
  });

  overlayBtn.addEventListener('click', handleOverlayClick);

  container.appendChild(overlayBtn);
  document.body.appendChild(container);
}

async function handleOverlayClick() {
  const url = window.location.href;
  const span = overlayBtn.querySelector('span');
  const svg = overlayBtn.querySelector('svg');

  // YouTube Behavior: Instant processing via Python API
  if (url.includes('youtube.com/watch')) {
    span.textContent = 'Processing...';
    overlayBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
    overlayBtn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
    svg.setAttribute('stroke', '#10b981');
    overlayBtn.disabled = true;

    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');

    const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') || document.querySelector('h1.ytd-watch-metadata');
    const title = titleEl ? titleEl.textContent.trim() : null;

    chrome.runtime.sendMessage({ 
      type: 'YOUTUBE_INSTANT_PROCESS', 
      videoId, 
      metadata: { platform: 'youtube', videoId, title, url } 
    }, (response) => {
      if (response && response.success) {
        span.textContent = 'Saved to Library!';
        setTimeout(() => resetBtnState(span, svg), 3000);
      } else {
        span.textContent = 'Failed';
        overlayBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
        overlayBtn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        svg.setAttribute('stroke', '#ef4444');
        setTimeout(() => resetBtnState(span, svg), 3000);
      }
    });
  } 
  // Google Meet Behavior: Toggle Live Scraping
  else if (url.includes('meet.google.com')) {
    if (!isListening) {
      isListening = true;
      span.textContent = 'Stop & Process';
      overlayBtn.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
      overlayBtn.style.borderColor = 'rgba(245, 158, 11, 0.5)';
      svg.setAttribute('stroke', '#fbbf24');
      svg.innerHTML = '<rect x="6" y="6" width="12" height="12"></rect>';
      
      window.dispatchEvent(new CustomEvent('WATCHNT_MEET_START'));
    } else {
      isListening = false;
      resetBtnState(span, svg);
      window.dispatchEvent(new CustomEvent('WATCHNT_MEET_STOP'));
    }
  }
  // Generic Audio / Podcast Capture
  else {
    if (!isListening) {
      isListening = true;
      span.textContent = 'Stop Audio Capture';
      overlayBtn.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
      overlayBtn.style.borderColor = 'rgba(245, 158, 11, 0.5)';
      svg.setAttribute('stroke', '#fbbf24');
      svg.innerHTML = '<rect x="6" y="6" width="12" height="12"></rect>';
      
      // Send message to background to start TabCapture
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.START_AUDIO_CAPTURE });
    } else {
      isListening = false;
      resetBtnState(span, svg);
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.STOP_AUDIO_CAPTURE });
    }
  }
}

function resetBtnState(span, svg) {
  span.textContent = "Capture with Watchn't";
  overlayBtn.style.backgroundColor = 'rgba(24, 24, 27, 0.85)';
  overlayBtn.style.borderColor = 'rgba(255,255,255,0.1)';
  svg.setAttribute('stroke', '#818cf8');
  svg.innerHTML = '<circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon>';
  overlayBtn.disabled = false;
}

// Injected manually by popup.js via chrome.scripting
injectOverlay();
