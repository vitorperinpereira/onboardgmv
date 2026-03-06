import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as metricsRoute } from "@/app/api/admin/metrics/route";
import { resetRepository, setRepository } from "@/repositories";
import { InMemoryOnboardingRepository } from "@/repositories/inMemoryRepository";
import { resetRateLimitStore } from "@/services/rateLimit";
import { resetApiMetrics } from "@/services/observability";

describe("GET /api/admin/metrics", () => {
  beforeEach(() => {
    resetRepository();
    setRepository(new InMemoryOnboardingRepository());
    resetRateLimitStore();
    resetApiMetrics();
  });

  it("requires admin token", async () => {
    const response = await metricsRoute(new NextRequest("http://localhost/api/admin/metrics"));
    expect(response.status).toBe(401);
  });

  it("returns metrics payload when authorized", async () => {
    const response = await metricsRoute(
      new NextRequest("http://localhost/api/admin/metrics", {
        headers: {
          "x-admin-token": "dev-admin-token",
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.sessions).toBeTruthy();
    expect(body.queue).toBeTruthy();
    expect(body.api).toBeTruthy();
    expect(body.api.overall).toBeTruthy();
  });
});
