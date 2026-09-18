## Tiny Distributed system

This project is a tiny two services that communicate between them async (kafka) as well as some config around observability.

The name inspred by https://github.com/jamiebuilds/the-super-tiny-compiler

### monorepos

Two Node.js services in a pnpm workspace:

- `packages/app` — HTTP producer. Exposes `POST /rolldice` and publishes a JSON event to Kafka.
- `packages/consumer` — Kafka consumer. Reads events and persists them to Postgres.

Both services expose `/metrics` (Prometheus) and are instrumented with OpenTelemetry auto-instrumentations (`src/instrumentation.ts`).

### Stack

- Node.js ≥ 24 (native TS execution via `--import`)
- pnpm workspaces
- Kafka (KRaft mode, `apache/kafka:4.1.0`) via [`@platformatic/kafka`](https://github.com/platformatic/kafka)
- Postgres 17
- Prometheus + Grafana
- OpenTelemetry SDK Node
- oxlint / oxfmt

### Prerequisites

- Node.js ≥ 24
- pnpm ≥ 11
- Docker + Docker Compose
- (Optional) `kubectl` + a local cluster for the k8s manifests

### Quick start

```sh
pnpm install
cp .env.example .env
docker compose up -d
pnpm --filter app start
pnpm --filter consumer start
```

Trigger an event:

```sh
curl -X POST http://localhost:3000/rolldice \
  -H 'content-type: application/json' \
  -d '{"value": 4}'
```

### Kafka topic

`rolldice` is auto-created by the `kafka-init` service in Compose (1 partition, replication factor 1). Message shape:

```json
{ "event": "rolldice", "value": 4 }
```

### Postgres schema

Created by `postgres-init` on boot:

```sql
CREATE DATABASE consumer;
CREATE TABLE IF NOT EXISTS rolldice (
  id SERIAL PRIMARY KEY,
  value INTEGER NOT NULL
);
```

### Observability

- Both services call `collectDefaultMetrics()` and expose custom counters:
  - app: `rolldice_requests_total{value}`
  - consumer: `rolldice_events_consumed_total{value}`
- Prometheus config: [infra/prometheus/prometheus.yml](infra/prometheus/prometheus.yml) — scrapes `host.docker.internal:3000` and `:3001` every 5s.
- Grafana provisioning: [grafana/provisioning](grafana/provisioning).
- Tracing/metrics via OpenTelemetry are wired in each service's `src/instrumentation.ts` and loaded with `node --import`.

### TODO

[] Configure consumer pod
