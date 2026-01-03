/**
 * Development-only logging utility.
 * Set VITE_DEBUG_LOGS=true to enable verbose logs in dev.
 */

const isDev = import.meta.env.DEV;
const isDebugEnabled = isDev && import.meta.env.VITE_DEBUG_LOGS === 'true';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDebugEnabled) {
      console.log(...args);
    }
  },

  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isDebugEnabled) {
      console.warn(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDebugEnabled) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (isDebugEnabled) {
      console.debug(...args);
    }
  },

  group: (label: string) => {
    if (isDebugEnabled) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDebugEnabled) {
      console.groupEnd();
    }
  },
};

export default logger;
