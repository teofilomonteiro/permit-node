import winston from 'winston';

import { config } from './config';

const consoleFormat = winston.format.printf(
  ({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
  }
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console({
      // If not in debug - show nothing in console
      silent: !config.isDebug,
      format: winston.format.combine(
        winston.format.label({ label: config.logLabel }),
        winston.format.timestamp(),
        config.logJSON ? winston.format.prettyPrint() : consoleFormat,
        winston.format.colorize({ all: true })
      ),
    }),
  ],
});
