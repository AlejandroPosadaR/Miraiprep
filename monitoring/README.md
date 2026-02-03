# Monitoring Stack - Prometheus & Grafana

Enterprise-grade observability setup for the AIMock application.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backend   │────▶│  Prometheus │────▶│   Grafana   │
│   :8080     │     │   :9090     │     │   :3001     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       ▼                   ▼
  /actuator/         Alerting
  prometheus          Rules
```

## Quick Start

```bash
# Start all services
docker compose up -d

# Verify services are healthy
docker compose ps

# View logs
docker compose logs -f prometheus grafana
```

## Access Points

| Service     | URL                          | Credentials        |
|------------|------------------------------|-------------------|
| Grafana    | http://localhost:3001        | admin / admin     |
| Prometheus | http://localhost:9090        | N/A               |
| Metrics    | http://localhost:8080/actuator/prometheus | N/A   |

### Note on 401 Errors

If you see `401 Unauthorized` errors in Grafana logs, this is **normal behavior**:
- Grafana requires authentication to query datasources
- These errors occur when:
  - Dashboard loads before you're logged in
  - Session expires and needs refresh
  - Browser makes background requests without auth
- **Solution**: Log in to Grafana at http://localhost:3001 with `admin/admin`
- Once logged in, the dashboard will work correctly

## Dashboard Features

The pre-configured dashboard includes:

### Overview Row
- **Backend Status**: Up/Down indicator
- **WebSocket Connections**: Active connection count
- **AI Response P95**: 95th percentile response time
- **AI Requests (1h)**: Total AI requests in the last hour
- **AI Error Rate**: Current failure percentage
- **JVM Heap Usage**: Memory utilization percentage

### AI Processing Section
- Response duration percentiles (P50, P95, P99)
- Success vs. failure rate over time

### WebSocket Section
- Active connections over time
- Message send rate

### HTTP & JVM Section
- Request rate by endpoint
- JVM heap memory by pool
- Database connection pool status
- Thread counts

## Custom Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `websocket_connections_active` | Gauge | Current WebSocket connections |
| `websocket_messages_sent_total` | Counter | Total messages sent via WebSocket |
| `ai_response_duration_seconds` | Histogram | AI response generation time |
| `ai_processing_success_total` | Counter | Successful AI processing jobs |
| `ai_processing_failure_total` | Counter | Failed AI processing jobs |

## Alerting Rules

Pre-configured alerts in `prometheus/rules/alerts.yml`:

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighAIProcessingFailureRate | >0.1 failures/sec for 2m | Warning |
| SlowAIResponseTime | P95 >30s for 5m | Warning |
| HighHTTPErrorRate | >5% 5xx errors for 2m | Critical |
| HighWebSocketConnections | >100 connections for 5m | Warning |
| HighJVMMemoryUsage | >90% heap for 5m | Warning |
| ApplicationDown | Backend down for 1m | Critical |
| DatabaseConnectionPoolExhausted | >90% connections for 2m | Critical |

## Configuration

### Environment Variables

```bash
# Grafana (optional, defaults shown)
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
```

### Prometheus Retention

Default retention settings:
- **Time**: 15 days
- **Size**: 10GB

Modify in `docker-compose.yml`:
```yaml
command:
  - '--storage.tsdb.retention.time=15d'
  - '--storage.tsdb.retention.size=10GB'
```

### Adding Custom Metrics

1. **In your Java code**:
```java
@Autowired
private MeterRegistry meterRegistry;

Counter myCounter = Counter.builder("my.custom.metric")
    .description("Description")
    .register(meterRegistry);

myCounter.increment();
```

2. **In Grafana**, query with:
```promql
rate(my_custom_metric_total[5m])
```

## Troubleshooting

### Prometheus can't scrape backend

```bash
# Check if backend is running
curl http://localhost:8080/actuator/health

# Verify metrics endpoint
curl http://localhost:8080/actuator/prometheus | head -20

# Check Prometheus targets
open http://localhost:9090/targets
```

### No data in Grafana

1. Check datasource connection: Grafana → Settings → Data Sources → Prometheus → Test
2. Verify time range is appropriate
3. Check if metrics exist: Prometheus → Graph → Search for metric name

### High memory usage

```bash
# Check Prometheus memory
docker stats aimock-prometheus

# Reduce retention if needed
# Edit docker-compose.yml retention settings
```

## Production Checklist

### Security
- [ ] Change default Grafana password
- [ ] Enable HTTPS for Grafana
- [ ] Restrict `/actuator/**` endpoints or add authentication
- [ ] Configure Prometheus basic auth

### High Availability
- [ ] Use Prometheus federation for multiple instances
- [ ] Configure Grafana HA with shared database
- [ ] Set up alerting to external systems (PagerDuty, Slack)

### Performance
- [ ] Tune scrape intervals based on load
- [ ] Configure appropriate retention
- [ ] Add resource limits based on actual usage

### Backup
- [ ] Backup Grafana dashboards (export JSON)
- [ ] Backup Prometheus data volume
- [ ] Version control monitoring configs

## File Structure

```
monitoring/
├── prometheus.yml              # Prometheus configuration
├── prometheus/
│   └── rules/
│       └── alerts.yml          # Alerting rules
├── grafana/
│   ├── dashboards/
│   │   ├── dashboard.yml       # Dashboard provisioning
│   │   └── aimock-dashboard.json # Main dashboard
│   └── datasources/
│       └── datasource.yml      # Prometheus datasource
└── README.md                   # This file
```

## Useful PromQL Queries

```promql
# Request rate by status code
sum(rate(http_server_requests_seconds_count[5m])) by (status)

# Average response time
rate(http_server_requests_seconds_sum[5m]) / rate(http_server_requests_seconds_count[5m])

# Error rate percentage
sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m])) / sum(rate(http_server_requests_seconds_count[5m])) * 100

# AI success rate
sum(rate(ai_processing_success_total[5m])) / (sum(rate(ai_processing_success_total[5m])) + sum(rate(ai_processing_failure_total[5m]))) * 100

# Memory pressure
jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"} * 100
```
