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
