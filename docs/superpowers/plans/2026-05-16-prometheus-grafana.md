# Prometheus + Grafana + Node Exporter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Self-hosted metrics stack with pre-built dashboards wired into docker-compose.
**Architecture:** Prometheus scrapes `backend:3000/pub/metrics` and `node-exporter:9100` every 15s. Grafana auto-provisions datasource and two dashboards on first boot.
**Tech Stack:** prom/prometheus:v2.53.0, prom/node-exporter:v1.8.1, grafana/grafana:11.1.0

---

### Task 1: Prometheus + Grafana provisioning configs
**Files:** Create `monitoring/prometheus.yml`, `monitoring/grafana/provisioning/datasources/prometheus.yml`, `monitoring/grafana/provisioning/dashboards/dashboards.yml`

- [ ] `monitoring/prometheus.yml` — global `scrape_interval: 15s`; two jobs: `edae` targeting `backend:3000` with `metrics_path: /pub/metrics`, and `node-exporter` targeting `node-exporter:9100`
- [ ] `monitoring/grafana/provisioning/datasources/prometheus.yml` — apiVersion 1, single datasource named `Prometheus`, type `prometheus`, url `http://prometheus:9090`, `isDefault: true`, `editable: false`
- [ ] `monitoring/grafana/provisioning/dashboards/dashboards.yml` — apiVersion 1, single provider: type `file`, path `/var/lib/grafana/dashboards`, `disableDeletion: true`, `updateIntervalSeconds: 30`

---

### Task 2: EDAE app dashboard JSON
**Files:** Create `monitoring/grafana/dashboards/edae-app.json`

- [ ] Write Grafana dashboard JSON with uid `edae-app`, title `EDAE Application`, `refresh: 10s`, using `${DS_PROMETHEUS}` as datasource. Three rows, 11 panels:
  - **Row 1 — HTTP Traffic:** time series request rate by route (`sum by(route)(rate(http_request_duration_seconds_count[1m]))`), stat 5xx error % (`sum(rate(...{status_code=~"5.."}[5m]))/sum(rate(...[5m]))*100`), time series latency P50/P95/P99 (`histogram_quantile(0.50|0.95|0.99, sum by(le)(rate(http_request_duration_seconds_bucket[5m])))`)
  - **Row 2 — Business Events:** time series registrations/min (`rate(user_registrations_total[1m])`), stat total registrations, time series logins/min (`rate(user_logins_total[1m])`), stat total logins
  - **Row 3 — Node.js Runtime:** time series heap (`nodejs_heap_size_used_bytes` + `nodejs_heap_size_total_bytes`), stat event loop lag p99 (`nodejs_eventloop_lag_p99_seconds`), time series CPU % (`rate(process_cpu_seconds_total[1m])*100`), time series active handles (`nodejs_active_handles_total`)

---

### Task 3: Node Exporter Full dashboard
**Files:** Create `monitoring/grafana/dashboards/node-exporter.json`

- [ ] `curl -sL "https://grafana.com/api/dashboards/1860/revisions/37/download" -o monitoring/grafana/dashboards/node-exporter.json`
- [ ] Verify valid JSON: `node -e "JSON.parse(require('fs').readFileSync('monitoring/grafana/dashboards/node-exporter.json','utf8'))"`

---

### Task 4: docker-compose.yml + env vars
**Files:** Modify `docker-compose.yml`, `.env.docker`, `.env.example`

- [ ] Add `prometheus` service: image `prom/prometheus:v2.53.0`, restart `unless-stopped`, mount `./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml` and volume `prometheus_data:/prometheus`, port `9090:9090`, depends_on `backend`
- [ ] Add `node-exporter` service: image `prom/node-exporter:v1.8.1`, restart `unless-stopped`, `pid: host`, mount `/proc:/host/proc:ro`, `/sys:/host/sys:ro`, `/:/rootfs:ro`, command flags `--path.procfs=/host/proc --path.sysfs=/host/sys --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)`
- [ ] Add `grafana` service: image `grafana/grafana:11.1.0`, restart `unless-stopped`, `env_file: .env.docker`, port `3001:3000`, mount `./monitoring/grafana/provisioning:/etc/grafana/provisioning` and `./monitoring/grafana/dashboards:/var/lib/grafana/dashboards`, volume `grafana_data:/var/lib/grafana`, depends_on `prometheus`
- [ ] Add `prometheus_data:` and `grafana_data:` under the top-level `volumes:` block
- [ ] Add `GF_SECURITY_ADMIN_PASSWORD=changeme` to both `.env.docker` and `.env.example`

---

### Task 5: Verify
- [ ] `docker compose up -d prometheus node-exporter grafana`
- [ ] Open `http://localhost:3001`, log in with admin credentials from `.env.docker`
- [ ] Connections → Data sources: Prometheus datasource shows green
- [ ] EDAE Application dashboard: all 11 panels populate after first 15s scrape
- [ ] Node Exporter Full dashboard: host CPU, memory, disk panels show data
