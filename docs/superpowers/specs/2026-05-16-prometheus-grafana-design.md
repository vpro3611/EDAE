# Design: Prometheus + Grafana + Node Exporter Monitoring Stack

## 1. Overview

Add a self-hosted observability stack to visualise the metrics already exposed by the application at `GET /pub/metrics`. Prometheus scrapes and stores time-series data; Node Exporter exposes host-level system metrics; Grafana serves pre-built dashboards for both.

## 2. Goals

- **Zero-click dashboards:** Boot `docker compose up` and Grafana is immediately populated with useful data — no manual datasource or dashboard configuration required.
- **App visibility:** HTTP traffic, error rates, latency percentiles, and business event counters (registrations, logins).
- **Runtime visibility:** Node.js heap, event loop lag, GC, CPU, and active handles.
- **Host visibility:** CPU, memory, disk I/O, and network via Node Exporter.
- **Persistent storage:** Prometheus time-series and Grafana state (dashboards, annotations) survive container restarts via named volumes.

## 3. Architecture

```
Host machine
  └─ Node Exporter :9100 (internal) ──────────┐
                                               ▼
App :3000/pub/metrics ──────────────→ Prometheus :9090 ──→ Grafana :3001
```

Prometheus scrapes both targets every 15 seconds. Grafana is pre-provisioned with Prometheus as a datasource and reads two dashboard JSON files from disk on startup.

## 4. File Structure

All monitoring configuration lives under `monitoring/` in the repository root.

```
monitoring/
  prometheus.yml
  grafana/
    provisioning/
      datasources/
        prometheus.yml
      dashboards/
        dashboards.yml
    dashboards/
      edae-app.json          ← custom EDAE application dashboard
      node-exporter.json     ← Node Exporter Full (community standard, ID 1860)
```

## 5. Services

### 5.1 Prometheus

- **Image:** `prom/prometheus:v2.53.0` (pinned)
- **Config:** `monitoring/prometheus.yml` mounted at `/etc/prometheus/prometheus.yml`
- **Scrape targets:**
  - `backend:3000` path `/pub/metrics` — app metrics (prom-client)
  - `node-exporter:9100` — host system metrics
- **Scrape interval:** 15s global, 15s per job
- **Retention:** default 15 days (sufficient for development; configurable via `--storage.tsdb.retention.time`)
- **Port:** 9090 exposed externally for ad-hoc PromQL debugging
- **Volume:** `prometheus_data:/prometheus`
- **Depends on:** `backend` (healthy scrape target exists before Prometheus starts)

### 5.2 Node Exporter

- **Image:** `prom/node-exporter:v1.8.1` (pinned)
- **PID mode:** `host` — required to read host process stats
- **Mounts (read-only):**
  - `/proc` → `/host/proc`
  - `/sys` → `/host/sys`
  - `/` → `/rootfs`
- **CLI flags:** `--path.procfs=/host/proc`, `--path.sysfs=/host/sys`, filesystem exclude pattern to skip pseudo-filesystems
- **Port:** internal only (9100), not exposed to the host
- **No named volume needed**

### 5.3 Grafana

- **Image:** `grafana/grafana:11.1.0` (pinned)
- **Port:** 3001 (host) → 3000 (container)
- **Admin password:** `GF_SECURITY_ADMIN_PASSWORD` read from `.env.docker`
- **Sign-up:** disabled (`GF_USERS_ALLOW_SIGN_UP=false`)
- **Provisioning mounts:**
  - `monitoring/grafana/provisioning` → `/etc/grafana/provisioning`
  - `monitoring/grafana/dashboards` → `/var/lib/grafana/dashboards`
- **Volume:** `grafana_data:/var/lib/grafana`
- **Depends on:** `prometheus`

## 6. Grafana Provisioning

### 6.1 Datasource (`provisioning/datasources/prometheus.yml`)

Registers Prometheus at `http://prometheus:9090` as the default datasource named "Prometheus". Type: `prometheus`.

### 6.2 Dashboard Provider (`provisioning/dashboards/dashboards.yml`)

Points Grafana at `/var/lib/grafana/dashboards` with `disableDeletion: true` and `updateIntervalSeconds: 30` so dashboards reload if the JSON files change without restarting the container.

## 7. Dashboards

### 7.1 EDAE Application Dashboard (`edae-app.json`)

Three rows, 11 panels. All panels use the provisioned Prometheus datasource.

**Row 1 — HTTP Traffic**
| Panel | Type | Query |
|---|---|---|
| Request rate (by route) | Time series | `sum by (route) (rate(http_request_duration_seconds_count[1m]))` |
| Error rate % (5xx) | Stat | `sum(rate(http_request_duration_seconds_count{status_code=~"5.."}[5m])) / sum(rate(http_request_duration_seconds_count[5m])) * 100` |
| Latency P50 / P95 / P99 | Time series | `histogram_quantile(0.50|0.95|0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))` |

**Row 2 — Business Events**
| Panel | Type | Query |
|---|---|---|
| Registrations/min | Time series | `rate(user_registrations_total[1m])` |
| Registrations total | Stat | `user_registrations_total` |
| Logins/min | Time series | `rate(user_logins_total[1m])` |
| Logins total | Stat | `user_logins_total` |

**Row 3 — Node.js Runtime**
| Panel | Type | Query |
|---|---|---|
| Heap used vs total | Time series | `nodejs_heap_size_used_bytes`, `nodejs_heap_size_total_bytes` |
| Event loop lag P99 | Stat | `nodejs_eventloop_lag_p99_seconds` |
| Process CPU % | Time series | `rate(process_cpu_seconds_total[1m]) * 100` |
| Active handles | Time series | `nodejs_active_handles_total` |

### 7.2 Node Exporter Full Dashboard (`node-exporter.json`)

The community-standard "Node Exporter Full" dashboard (Grafana ID 1860) downloaded and committed to the repository. Covers host CPU, memory, disk I/O, filesystem, and network. No modifications needed.

## 8. Environment Variables

Add to `.env.docker` and `.env.example`:

```
GF_SECURITY_ADMIN_PASSWORD=changeme
```

Grafana reads `GF_SECURITY_ADMIN_PASSWORD` directly from the environment (passed via `env_file: .env.docker` in docker-compose). Should be changed before any non-local deployment.

## 9. Security

- Node Exporter port 9100 is not exposed to the host — only reachable within the Docker network by Prometheus.
- Prometheus port 9090 is exposed for developer convenience; in production this should be restricted or removed.
- Grafana user sign-up is disabled.
- The `/pub/metrics` endpoint already has a rate limiter (10 burst, 2/10s refill); Prometheus at 15s interval (4 req/min) is well within this limit.

## 10. Volumes Added

```yaml
prometheus_data:
grafana_data:
```

Both are named Docker volumes. `backend_logs` (added in the logging feature) is unchanged.
