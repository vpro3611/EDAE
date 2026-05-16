# Logging and Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a centralized logging and metrics system using Winston and `prom-client` to track application state and performance.

**Architecture:** A `LoggerService` provides structured logging with console and rotating file transports. A `MetricsService` tracks system and business metrics. Both are integrated into the Express request lifecycle and error handling.

**Tech Stack:** Node.js, Express, Winston, `winston-daily-rotate-file`, `prom-client`.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install winston, winston-daily-rotate-file, and prom-client**

Run: `npm install winston winston-daily-rotate-file prom-client`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add logging and metrics dependencies"
```

---

### Task 2: Implement LoggerService

**Files:**
- Create: `src/modules/infra/observability/logger.service.ts`

- [ ] **Step 1: Create LoggerService with Winston**

```typescript
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
        this.logger.error(message, { error: error instanceof Error ? { message: error.message, stack: error.stack } : error, context });
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
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/infra/observability/logger.service.ts
git commit -m "feat: implement LoggerService with Winston"
```

---

### Task 3: Implement MetricsService

**Files:**
- Create: `src/modules/infra/observability/metrics.service.ts`

- [ ] **Step 1: Create MetricsService with prom-client**

```typescript
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

export class MetricsService {
    private registry: Registry;
    public httpRequestDuration: Histogram<string>;
    public userRegistrations: Counter<string>;
    public userLogins: Counter<string>;
    public reportsGenerated: Counter<string>;

    constructor() {
        this.registry = new Registry();
        collectDefaultMetrics({ register: this.registry });

        this.httpRequestDuration = new Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status_code'],
            registers: [this.registry],
        });

        this.userRegistrations = new Counter({
            name: 'user_registrations_total',
            help: 'Total number of user registrations',
            registers: [this.registry],
        });

        this.userLogins = new Counter({
            name: 'user_logins_total',
            help: 'Total number of user logins',
            registers: [this.registry],
        });

        this.reportsGenerated = new Counter({
            name: 'reports_generated_total',
            help: 'Total number of reports generated',
            registers: [this.registry],
        });
    }

    async getMetrics(): Promise<string> {
        return await this.registry.metrics();
    }

    getContentType(): string {
        return this.registry.contentType;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/infra/observability/metrics.service.ts
git commit -m "feat: implement MetricsService with prom-client"
```

---

### Task 4: Register Services in Container

**Files:**
- Modify: `src/container.ts`

- [ ] **Step 1: Update DepsContainer to include logger and metrics**

```typescript
// ... imports
import { LoggerService } from "./modules/infra/observability/logger.service";
import { MetricsService } from "./modules/infra/observability/metrics.service";

export interface DepsContainer {
    // ... existing
    logger: LoggerService;
    metrics: MetricsService;
}

export async function createContainer(): Promise<DepsContainer> {
    // ... existing
    const nodeEnv = process.env.NODE_ENV || 'development';
    const logger = new LoggerService(nodeEnv);
    const metrics = new MetricsService();

    return {
        // ... existing
        logger,
        metrics,
    };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/container.ts
git commit -m "feat: register logger and metrics in container"
```

---

### Task 5: Implement Logging Middleware

**Files:**
- Create: `src/modules/middlewares/middleware.logging.ts`

- [ ] **Step 1: Create logging middleware**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/middlewares/middleware.logging.ts
git commit -m "feat: add HTTP logging middleware"
```

---

### Task 6: Implement Metrics Middleware

**Files:**
- Create: `src/modules/middlewares/middleware.metrics.ts`

- [ ] **Step 1: Create metrics middleware**

```typescript
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../infra/observability/metrics.service';

export const metricsMiddleware = (metrics: MetricsService) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            const route = req.route ? req.route.path : req.originalUrl;
            metrics.httpRequestDuration.observe(
                {
                    method: req.method,
                    route: route,
                    status_code: res.statusCode.toString(),
                },
                duration
            );
        });
        next();
    };
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/middlewares/middleware.metrics.ts
git commit -m "feat: add HTTP metrics middleware"
```

---

### Task 7: Update Error Middleware

**Files:**
- Modify: `src/modules/middlewares/middleware.errors.ts`

- [ ] **Step 1: Update errorsMiddleware to log errors via LoggerService**

```typescript
import {NextFunction, Request, Response} from "express";
import {AppError} from "../errors/errors.global";
import {DatabaseError} from "../errors/errors.database";
import {ZodError} from "zod";
import { LoggerService } from "../infra/observability/logger.service";

export const errorsMiddleware = (logger: LoggerService) => {
    return (err: Error, req: Request, res: Response, next: NextFunction)=> {
        if (err instanceof ZodError) {
            return res.status(400)
                .json({message: err.issues.map(issue => issue.message).join(', ')});
        }
        if (err instanceof AppError) {
            logger.error(`AppError: ${err.message}`, err, err.internalError);
            return res.status(err.statusCode)
                .json({message: err.message, originalMessageError: err.originalErrorMessage});
        }
        if (err instanceof DatabaseError) {
            logger.error(`DatabaseError: ${err.message}`, err);
            return res.status(500)
                .json({message: 'Internal server error', originalMessageError: err.message});
        }
        
        logger.error(`Unexpected Error: ${err.message}`, err);
        if (process.env.NODE_ENV === 'production') {
            return res.status(500).json({message: `Unexpected internal server error`});
        } else {
            return res.status(500).json({message: `Unexpected internal server error: ${err.message} | stack: ${err.stack} | cause: ${err.cause}`})
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/middlewares/middleware.errors.ts
git commit -m "feat: log errors in errorsMiddleware"
```

---

### Task 8: Integrate Observability in app.ts

**Files:**
- Modify: `src/app.ts`

- [ ] **Step 1: Register middlewares and /metrics route**

```typescript
// ... imports
import { loggingMiddleware } from "./modules/middlewares/middleware.logging";
import { metricsMiddleware } from "./modules/middlewares/middleware.metrics";

export function createApp(dependencies: DepsContainer): Express {
    const app = express();

    app.use(loggingMiddleware(dependencies.logger));
    app.use(metricsMiddleware(dependencies.metrics));
    app.use(express.json());
    // ... rest of setup

    publicRouter.get("/metrics", async (req, res) => {
        res.set('Content-Type', dependencies.metrics.getContentType());
        res.end(await dependencies.metrics.getMetrics());
    });

    // ... routes

    app.use(errorsMiddleware(dependencies.logger));

    return app;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app.ts
git commit -m "feat: integrate logging and metrics into app pipeline"
```

---

### Task 9: Instrument Business Events

**Files:**
- Modify: `src/modules/authentification/auth_service.ts`

- [ ] **Step 1: Increment counters in AuthService**

```typescript
// Modify AuthentificationService to take metrics dependency and increment counters in registerConfirm and login methods.
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/authentification/auth_service.ts
git commit -m "feat: instrument registration and login business metrics"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run the application**

Run: `npm run dev`

- [ ] **Step 2: Verify logs**

Check if `logs/` directory is created and `application-YYYY-MM-DD.log` contains entries.

- [ ] **Step 3: Verify metrics**

Run: `curl http://localhost:3000/pub/metrics`
Expected: Prometheus format metrics (including `http_request_duration_seconds`).

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "docs: finalize logging and metrics implementation"
```
