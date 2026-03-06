import { ok, withApiMetrics } from "@/app/api/utils";
import { buildHealthPayload } from "@/lib/health";

export async function GET() {
  return withApiMetrics("/api/health", async () => ok(buildHealthPayload()));
}
