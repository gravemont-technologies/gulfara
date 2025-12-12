const defaultLevel = (import.meta.env.VITE_LOG_LEVEL ?? 'INFO').toUpperCase();

const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

type LogLevel = typeof levels[number];

function format(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const contextPart = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level}] ${message}${contextPart}`;
}

function shouldLog(level: LogLevel) {
  return levels.indexOf(level) >= levels.indexOf(defaultLevel as LogLevel);
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('DEBUG')) return;
    console.log(format('DEBUG', message, context));
  },
  info(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('INFO')) return;
    console.log(format('INFO', message, context));
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('WARN')) return;
    console.warn(format('WARN', message, context));
  },
  error(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('ERROR')) return;
    console.error(format('ERROR', message, context));
  }
};
