const logger = {
  log: (...args) => console.log('[Watchnt][LOG]', ...args),
  warn: (...args) => console.warn('[Watchnt][WARN]', ...args),
  error: (...args) => console.error('[Watchnt][ERROR]', ...args),
  debug: (...args) => {
    // Note: process is not defined natively in browser, but esbuild handles process.env inline replacement or polyfill
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
      return;
    }
    console.debug('[Watchnt][DEBUG]', ...args);
  }
};

export default logger;
