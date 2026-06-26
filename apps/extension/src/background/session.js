import { SESSION_STATUS, MESSAGE_TYPES } from '../shared/constants.js';
import { getSessions, setSession as saveSession, removeSession as deleteSession } from '../storage/local.js';
import logger from '../shared/logger.js';

const sessions = new Map();

export async function restoreSessions() {
  const stored = await getSessions();
  sessions.clear();
  for (const [id, session] of stored.entries()) {
    sessions.set(Number(id), session);
  }
}

export async function createSession(tabId, metadata) {
  const session = {
    tabId,
    ...metadata,
    status: SESSION_STATUS.CAPTURING,
    chunks: [],
    startedAt: Date.now()
  };
  sessions.set(tabId, session);
  await saveSession(tabId, session);
  logger.log(`Created session for tab ${tabId}`);
  return session;
}

export async function appendChunks(tabId, segments) {
  const session = sessions.get(tabId);
  if (!session) return;
  
  if (Array.isArray(segments)) {
    session.chunks.push(...segments);
  } else {
    session.chunks.push(segments);
  }
  
  sessions.set(tabId, session);
  await saveSession(tabId, session);
  logger.log(`Appended chunks for tab ${tabId}, total chunks: ${session.chunks.length}`);
}

export function getSession(tabId) {
  return sessions.get(tabId) || null;
}

export async function setStatus(tabId, status, extra = {}) {
  const session = sessions.get(tabId);
  if (!session) return;
  
  session.status = status;
  Object.assign(session, extra);
  
  sessions.set(tabId, session);
  await saveSession(tabId, session);
  
  try {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.STATUS_UPDATE,
      tabId,
      status,
      ...extra
    });
  } catch (err) {
    // Ignore error if popup/UI is not open
  }
}

export async function removeSession(tabId) {
  sessions.delete(tabId);
  await deleteSession(tabId);
}

export function getAllSessions() {
  return Array.from(sessions.values());
}
