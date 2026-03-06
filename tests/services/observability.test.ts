import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getApiMetricsSummary,
  pruneApiMetrics,
  recordApiMetric,
  resetApiMetrics,
} from "@/services/observability";

describe("observability service", () => {
  beforeEach(() => {
    resetApiMetrics();
  });

  it("aggregates per-route and overall latency/error metrics", () => {
    recordApiMetric("/api/a", 200, 100);
    recordApiMetric("/api/a", 200, 200);
    recordApiMetric("/api/a", 500, 300);
    recordApiMetric("/api/a", 200, 400);
    recordApiMetric("/api/a", 404, 500);
    recordApiMetric("/api/b", 200, 50);

    const summary = getApiMetricsSummary();
    const routeA = summary.routes["/api/a"];
    const routeB = summary.routes["/api/b"];

    expect(summary.overall.tracked_routes).toBe(2);
    expect(summary.overall.total_requests).toBe(6);
    expect(summary.overall.error_rate).toBeCloseTo(0.33, 2);
    expect(summary.overall.p95_ms).toBe(500);
    expect(summary.overall.p99_ms).toBe(500);

    expect(routeA).toBeTruthy();
    expect(routeA?.count).toBe(5);
    expect(routeA?.avg_ms).toBe(300);
    expect(routeA?.p95_ms).toBe(500);
    expect(routeA?.p99_ms).toBe(500);
    expect(routeA?.max_ms).toBe(500);
    expect(routeA?.error_rate).toBe(0.4);
    expect(routeA?.last_status).toBe(404);

    expect(routeB?.count).toBe(1);
    expect(routeB?.avg_ms).toBe(50);
    expect(routeB?.error_rate).toBe(0);
  });

  it("resets all collected metrics", () => {
    recordApiMetric("/api/health", 200, 20);
    resetApiMetrics();
    const summary = getApiMetricsSummary();

    expect(summary.overall.tracked_routes).toBe(0);
    expect(summary.overall.total_requests).toBe(0);
    expect(Object.keys(summary.routes)).toHaveLength(0);
  });

  it("prunes stale samples and keeps recent metrics", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1_000);
    recordApiMetric("/api/health", 200, 20);

    nowSpy.mockReturnValue(10_000);
    recordApiMetric("/api/health", 200, 30);

    const result = pruneApiMetrics(2_000);
    const summary = getApiMetricsSummary();

    expect(result.removed).toBe(1);
    expect(summary.overall.total_requests).toBe(1);
    expect(summary.routes["/api/health"]?.avg_ms).toBe(30);

    nowSpy.mockRestore();
  });
});
