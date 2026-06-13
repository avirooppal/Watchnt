import { restoreSessions, createSession, appendChunks, getSession, setStatus, removeSession } from './session.js';
import { enqueue, setJobHandler } from './queue.js';
import { runPipeline } from './orchestrator.js';
import { MESSAGE_TYPES, SESSION_STATUS } from '../shared/constants.js';
import api from '../storage/api.js';

setJobHandler(runPipeline);

chrome.runtime.onInstalled.addListener(() => {
  restoreSessions();
});

restoreSessions();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : message.tabId;
  
  if (!tabId && !message.tabId && message.type !== MESSAGE_TYPES.START_AUDIO_CAPTURE && message.type !== MESSAGE_TYPES.STOP_AUDIO_CAPTURE) return;

  if (message.type === MESSAGE_TYPES.TRANSCRIPT_CHUNK) {
    if (message.phase === 'start') {
      createSession(tabId, message.metadata);
    } else if (message.segments) {
      appendChunks(tabId, message.segments);
    } else if (message.text) {
      appendChunks(tabId, { text: message.text, timestamp: Date.now() });
    }
  } 
  else if (message.type === MESSAGE_TYPES.VIDEO_ENDED) {
    const session = getSession(tabId);
    if (session) {
      setStatus(tabId, SESSION_STATUS.QUEUED);
      enqueue(session);
    }
  }
  else if (message.type === MESSAGE_TYPES.AUDIO_CHUNK) {
    api.post('/transcribe', { 
      audio: message.audio, 
      mimeType: message.mimeType, 
      durationSec: message.durationSec 
    }).then(response => {
      if (response && response.segments) {
         appendChunks(tabId, response.segments);
      }
    }).catch(err => {
      console.error('[Watchnt] Audio transcribe failed:', err);
    });
  }
  else if (message.type === MESSAGE_TYPES.START_AUDIO_CAPTURE) {
    const targetTabId = message.tabId;
    chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      files: ['content/audio-capture.js']
    }, () => {
      chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        func: () => window.__watchnt.startAudioCapture()
      });
      
      chrome.tabs.get(targetTabId, (tab) => {
        createSession(targetTabId, { platform: 'audio', title: tab.title, url: tab.url });
      });
    });
  }
  else if (message.type === MESSAGE_TYPES.STOP_AUDIO_CAPTURE) {
    const targetTabId = message.tabId;
    chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      func: () => {
        if (window.__watchnt) window.__watchnt.stopAudioCapture();
      }
    });
  }
  else if (message.type === 'INJECT_OVERLAY') {
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      files: ['content/overlay.js']
    });
  }
  else if (message.type === 'YOUTUBE_INSTANT_PROCESS') {
    const { videoId, metadata } = message;
    
    // Call our Node API which proxies to Python transcript-service
    api.post('/youtube', { videoId })
      .then(data => {
        if (!data || !data.text) throw new Error('No transcript returned');
        
        // 1. Create a session
        createSession(tabId, metadata);
        
        // 2. Append the massive transcript chunk
        appendChunks(tabId, { text: data.text, timestamp: Date.now() });
        
        // 3. Queue the session for LLM processing
        setStatus(tabId, SESSION_STATUS.QUEUED);
        const session = getSession(tabId);
        enqueue(session);
        
        sendResponse({ success: true });
      })
      .catch(err => {
        console.error('[Watchnt] Instant process failed:', err);
        sendResponse({ success: false, error: err.message });
      });
      
    return true; // Keep message channel open for async response
  }
  else if (message.type === MESSAGE_TYPES.OPEN_SIDEPANEL) {
    chrome.sidePanel.open({ tabId: tabId || message.tabId });
  }

  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const session = getSession(tabId);
    if (session && session.url !== changeInfo.url) {
       if (session.status === SESSION_STATUS.CAPTURING) {
         setStatus(tabId, SESSION_STATUS.QUEUED);
         enqueue(session);
       }
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const session = getSession(tabId);
  if (session && session.status === SESSION_STATUS.CAPTURING) {
     setStatus(tabId, SESSION_STATUS.QUEUED);
     enqueue(session);
  } else {
     removeSession(tabId);
  }
});
