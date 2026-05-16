import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../infra/observability/metrics.service';

export const metricsMiddleware = (metrics: MetricsService) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            const route = req.route ? req.route.path : req.originalUrl;
            metrics.httpRequestDuration.observe(
                { method: req.method, route, status_code: res.statusCode.toString() },
                duration
            );
        });
        next();
    };
};
