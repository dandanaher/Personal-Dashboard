/**
 * Development-only logging utility.
 * All log calls are no-ops in production builds.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  group: (label: string) => {
    if (isDev) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },
};

export default logger;
