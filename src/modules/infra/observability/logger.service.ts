import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

export class LoggerService {
    private logger: winston.Logger;

    constructor(nodeEnv: string) {
        const logDir = 'logs';

        const transports: winston.transport[] = [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                ),
            }),
            new winston.transports.DailyRotateFile({
                filename: path.join(logDir, 'application-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '14d',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                ),
            }),
        ];

        this.logger = winston.createLogger({
            level: nodeEnv === 'production' ? 'info' : 'debug',
            transports,
        });
    }

    info(message: string, context?: any) {
        this.logger.info(message, { context });
    }

    error(message: string, error?: any, context?: any) {
        this.logger.error(message, {
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
            context,
        });
    }

    warn(message: string, context?: any) {
        this.logger.warn(message, { context });
    }

    debug(message: string, context?: any) {
        this.logger.debug(message, { context });
    }

    http(message: string, context?: any) {
        this.logger.http(message, { context });
    }
}
