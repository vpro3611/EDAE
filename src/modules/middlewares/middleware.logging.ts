import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../infra/observability/logger.service';

export const loggingMiddleware = (logger: LoggerService) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
        });
        next();
    };
};
