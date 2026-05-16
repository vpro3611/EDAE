# Design: Logging and Metrics Implementation

## 1. Overview
Implement a comprehensive observability suite to track application state, performance, and business events.

## 2. Goals
- **Structured Logging:** Centralized logging with rotation to prevent disk exhaustion.
- **System Metrics:** Track HTTP latency, error rates, and resource usage (CPU/Memory).
- **Business Metrics:** Track high-level events (registrations, logins, report generation).
- **Visibility:** Expose a `/metrics` endpoint for Prometheus and store logs in a `logs/` directory.

## 3. Architecture

### 3.1 Components
- **`LoggerService`**: Based on `winston`.
    - **Transports**:
        - `Console`: Colored, human-readable for development.
        - `DailyRotateFile`: JSON-formatted, stored in `logs/` folder, rotated daily, kept for 14 days.
    - **Integration**: Replaces or supplements existing error handling to provide persistent audit trails.
- **`MetricsService`**: Based on `prom-client`.
    - **Registry**: Global registry for all metrics.
    - **Collectors**:
        - Default node.js metrics (heap, event loop).
        - HTTP Request Histogram (labels: `method`, `route`, `status_code`).
        - Custom Business Counters.

### 3.2 File Structure
- `src/modules/infra/observability/logger.service.ts`
- `src/modules/infra/observability/metrics.service.ts`
- `src/modules/middlewares/middleware.logging.ts` (Request logging)
- `src/modules/middlewares/middleware.metrics.ts` (Request instrumentation)

## 4. Integration Details

### 4.1 Dependency Injection
Register `logger` and `metrics` in `src/container.ts` so they are available to all controllers, use-cases, and workers.

### 4.2 Error Middleware
Update `src/modules/middlewares/middleware.errors.ts` to log all unhandled and application-level errors using the `LoggerService` with full stacks and context.

### 4.3 HTTP Pipeline
In `src/app.ts`:
1. Inject `loggingMiddleware` early to capture all requests.
2. Inject `metricsMiddleware` early to instrument durations.
3. Expose `GET /metrics` for external scraping.

## 5. Security & Maintenance
- **PII Scrubbing:** Ensure logs do not contain passwords, tokens, or sensitive user data (Zod schemas already help by defining what comes in, we must be careful with log statements).
- **Log Rotation:** `winston-daily-rotate-file` will be configured with `maxSize: '20m'` and `maxFiles: '14d'` to keep the `logs/` directory manageable.

## 6. Dependencies to Add
- `winston`
- `winston-daily-rotate-file`
- `prom-client`
- `@types/winston` (if not included)
