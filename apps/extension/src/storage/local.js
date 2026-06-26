import { STORAGE_KEYS } from '../shared/constants.js';

export async function getConfig() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
  return data[STORAGE_KEYS.CONFIG] || {};
}

export async function setConfig(partial) {
  const current = await getConfig();
  const updated = { ...current, ...partial };
  await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: updated });
}

export async function getSessions() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
  const sessions = data[STORAGE_KEYS.SESSIONS] || {};
  return new Map(Object.entries(sessions));
}

export async function setSession(tabId, session) {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
  const sessions = data[STORAGE_KEYS.SESSIONS] || {};
  sessions[tabId] = session;
  await chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: sessions });
}

export async function removeSession(tabId) {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
  const sessions = data[STORAGE_KEYS.SESSIONS] || {};
  if (sessions[tabId]) {
    delete sessions[tabId];
    await chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: sessions });
  }
}

export async function getCaptureStatus() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.CAPTURE_STATUS);
  return data[STORAGE_KEYS.CAPTURE_STATUS] || null;
}

export async function setCaptureStatus(status) {
  await chrome.storage.local.set({ [STORAGE_KEYS.CAPTURE_STATUS]: status });
}

export function onChange(key, callback) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[key]) {
      callback(changes[key].newValue, changes[key].oldValue);
    }
  });
}
