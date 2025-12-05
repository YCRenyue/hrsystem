/**
 * Logger utility
 *
 * Simple console-based logger with different log levels
 * In production, this should be replaced with winston or similar
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase() || 'INFO'];

/**
 * Format log message with timestamp and level
 */
function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
  return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
}

const logger = {
  error(message, ...args) {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', message, ...args));
    }
  },

  warn(message, ...args) {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, ...args));
    }
  },

  info(message, ...args) {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.info(formatMessage('INFO', message, ...args));
    }
  },

  debug(message, ...args) {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.log(formatMessage('DEBUG', message, ...args));
    }
  }
};

module.exports = logger;
