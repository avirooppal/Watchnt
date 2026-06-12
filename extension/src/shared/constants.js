export const PLATFORMS = {
  YOUTUBE: 'youtube',
  MEET: 'meet',
  PODCAST: 'podcast',
  AUDIO: 'audio'
};

export const AGENT_STEPS = {
  CAPTURE: 'capture',
  CONTEXT: 'context',
  TRANSLATION: 'translation',
  EXTRACTION: 'extraction',
  ACTION: 'action',
  CARD: 'card',
  ORGANISER: 'organiser',
  INDEX: 'index'
};

export const SESSION_STATUS = {
  IDLE: 'idle',
  CAPTURING: 'capturing',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error'
};

export const MESSAGE_TYPES = {
  TRANSCRIPT_CHUNK: 'TRANSCRIPT_CHUNK',
  VIDEO_ENDED: 'VIDEO_ENDED',
  STATUS_UPDATE: 'STATUS_UPDATE',
  OPEN_SIDEPANEL: 'OPEN_SIDEPANEL',
  AUDIO_CHUNK: 'AUDIO_CHUNK',
  START_AUDIO_CAPTURE: 'START_AUDIO_CAPTURE',
  STOP_AUDIO_CAPTURE: 'STOP_AUDIO_CAPTURE'
};

export const STORAGE_KEYS = {
  SESSIONS: 'sessions',
  QUEUE: 'queue',
  CONFIG: 'config',
  CAPTURE_STATUS: 'captureStatus'
};

export const LLM_PROVIDERS = {
  ANTHROPIC: 'anthropic',
  OLLAMA: 'ollama'
};
