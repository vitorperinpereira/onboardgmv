export type ApiMetricSample = {
  timestamp: number;
  durationMs: number;
  statusCode: number;
};

export type ApiRouteSummary = {
  count: number;
  avg_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
  error_rate: number;
  last_status: number;
  last_seen_at: string;
};

const MAX_SAMPLES_PER_ROUTE = 500;
const routeSamples = new Map<string, ApiMetricSample[]>();

function round(value: number) {
  return Number(value.toFixed(2));
}

function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

export function recordApiMetric(route: string, statusCode: number, durationMs: number) {
  const samples = routeSamples.get(route) ?? [];
  samples.push({
    timestamp: Date.now(),
    durationMs,
    statusCode,
  });

  if (samples.length > MAX_SAMPLES_PER_ROUTE) {
    samples.splice(0, samples.length - MAX_SAMPLES_PER_ROUTE);
  }

  routeSamples.set(route, samples);
}

export function getApiMetricsSummary() {
  const routes: Record<string, ApiRouteSummary> = {};
  const allDurations: number[] = [];
  let totalRequests = 0;
  let totalErrors = 0;

  for (const [route, samples] of routeSamples.entries()) {
    if (samples.length === 0) {
      continue;
    }

    const durations = samples.map((sample) => sample.durationMs);
    const errors = samples.filter((sample) => sample.statusCode >= 400).length;
    const lastSample = samples[samples.length - 1]!;

    allDurations.push(...durations);
    totalRequests += samples.length;
    totalErrors += errors;

    const avg = durations.reduce((sum, value) => sum + value, 0) / durations.length;

    routes[route] = {
      count: samples.length,
      avg_ms: round(avg),
      p95_ms: round(percentile(durations, 95)),
      p99_ms: round(percentile(durations, 99)),
      max_ms: round(Math.max(...durations)),
      error_rate: round(samples.length === 0 ? 0 : errors / samples.length),
      last_status: lastSample.statusCode,
      last_seen_at: new Date(lastSample.timestamp).toISOString(),
    };
  }

  return {
    overall: {
      tracked_routes: Object.keys(routes).length,
      total_requests: totalRequests,
      error_rate: round(totalRequests === 0 ? 0 : totalErrors / totalRequests),
      p95_ms: round(percentile(allDurations, 95)),
      p99_ms: round(percentile(allDurations, 99)),
    },
    routes,
  };
}

export function resetApiMetrics() {
  routeSamples.clear();
}

export function pruneApiMetrics(maxAgeMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;
  let before = 0;
  let after = 0;

  for (const [route, samples] of routeSamples.entries()) {
    before += samples.length;

    const fresh = samples.filter((sample) => sample.timestamp >= cutoff);
    removed += samples.length - fresh.length;
    after += fresh.length;

    if (fresh.length > 0) {
      routeSamples.set(route, fresh);
      continue;
    }

    routeSamples.delete(route);
  }

  return {
    before,
    after,
    removed,
  };
}
