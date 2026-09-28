import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

// Define transports
const transports = [
  // Console logging
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true })
    )
  }),
  // Daily rotating file for API requests
  new DailyRotateFile({
    filename: path.join(__dirname, '../../../logs/api-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info'
  }),
  // Daily rotating file for errors
  new DailyRotateFile({
    filename: path.join(__dirname, '../../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error'
  })
];

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels: winston.config.npm.levels,
  format: logFormat,
  transports
});

export default logger;
