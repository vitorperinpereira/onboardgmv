import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/app/api/rateLimit";
import { fromError, ok, withApiMetrics } from "@/app/api/utils";
import { assertAdminRequest } from "@/services/auth";
import { scheduleHousekeeping, scheduleMetricsSnapshot } from "@/services/maintenanceScheduler";
import { getOperationalMetrics } from "@/services/metricsService";

export async function GET(request: NextRequest) {
  return withApiMetrics("/api/admin/metrics", async () => {
    const authError = assertAdminRequest(request);
    if (authError) {
      return authError;
    }

    const rateLimited = enforceRateLimit({
      request,
      keyPrefix: "admin-metrics",
      limit: 180,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimited) {
      return rateLimited;
    }

    try {
      const metrics = await getOperationalMetrics();
      scheduleMetricsSnapshot("admin_metrics_polled");
      scheduleHousekeeping("admin_metrics_polled");
      return ok(metrics);
    } catch (error) {
      return fromError(error);
    }
  });
}
