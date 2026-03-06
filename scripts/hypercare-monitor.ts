import { appendFile, mkdir, writeFile } from "fs/promises";
import { join } from "path";

type MetricSnapshot = {
  timestamp: string;
  healthStatus: string;
  queueWaiting: number;
  queueActive: number;
  queueFailed: number;
  queueCompleted: number;
  apiP95Ms: number;
  apiErrorRate: number;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toCsvLine(snapshot: MetricSnapshot) {
  return [
    snapshot.timestamp,
    snapshot.healthStatus,
    snapshot.queueWaiting,
    snapshot.queueActive,
    snapshot.queueFailed,
    snapshot.queueCompleted,
    snapshot.apiP95Ms,
    snapshot.apiErrorRate,
  ].join(",");
}

async function poll(baseUrl: string, adminToken: string) {
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const health = (await healthRes.json()) as { status: string };

  const metricsRes = await fetch(`${baseUrl}/api/admin/metrics`, {
    headers: {
      "x-admin-token": adminToken,
    },
  });
  const metrics = (await metricsRes.json()) as {
    queue: {
      waiting: number;
      active: number;
      failed: number;
      completed: number;
    };
    api?: {
      overall?: {
        p95_ms?: number;
        error_rate?: number;
      };
    };
  };

  return {
    timestamp: new Date().toISOString(),
    healthStatus: health.status,
    queueWaiting: metrics.queue.waiting,
    queueActive: metrics.queue.active,
    queueFailed: metrics.queue.failed,
    queueCompleted: metrics.queue.completed,
    apiP95Ms: Number(metrics.api?.overall?.p95_ms ?? 0),
    apiErrorRate: Number(metrics.api?.overall?.error_rate ?? 0),
  } satisfies MetricSnapshot;
}

async function main() {
  const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
  const adminToken = process.env.ADMIN_API_TOKEN ?? "dev-admin-token";
  const intervalSec = Number(process.env.HYPERCARE_INTERVAL_SEC ?? "60");
  const durationMin = Number(process.env.HYPERCARE_DURATION_MIN ?? "30");
  const maxWaiting = Number(process.env.HYPERCARE_MAX_WAITING ?? "25");
  const maxFailed = Number(process.env.HYPERCARE_MAX_FAILED ?? "0");
  const maxApiP95Ms = Number(process.env.HYPERCARE_MAX_API_P95_MS ?? "2000");
  const maxApiErrorRate = Number(process.env.HYPERCARE_MAX_API_ERROR_RATE ?? "0.05");
  const failOnAlert = process.env.HYPERCARE_FAIL_ON_ALERT === "true";

  const reportsDir = join(process.cwd(), "reports", "hypercare");
  await mkdir(reportsDir, { recursive: true });

  const filename = `hypercare-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
  const filepath = join(reportsDir, filename);

  await writeFile(
    filepath,
    "timestamp,health,queue_waiting,queue_active,queue_failed,queue_completed,api_p95_ms,api_error_rate\n",
    "utf8",
  );

  const loops = Math.max(1, Math.ceil((durationMin * 60) / intervalSec));
  let alerts = 0;

  for (let i = 0; i < loops; i += 1) {
    const snapshot = await poll(baseUrl, adminToken);
    await appendFile(filepath, `${toCsvLine(snapshot)}\n`, "utf8");

    const issues: string[] = [];
    if (snapshot.healthStatus !== "ok") {
      issues.push(`health=${snapshot.healthStatus}`);
    }
    if (snapshot.queueWaiting > maxWaiting) {
      issues.push(`queue_waiting=${snapshot.queueWaiting}`);
    }
    if (snapshot.queueFailed > maxFailed) {
      issues.push(`queue_failed=${snapshot.queueFailed}`);
    }
    if (snapshot.apiP95Ms > maxApiP95Ms) {
      issues.push(`api_p95_ms=${snapshot.apiP95Ms}`);
    }
    if (snapshot.apiErrorRate > maxApiErrorRate) {
      issues.push(`api_error_rate=${snapshot.apiErrorRate}`);
    }

    if (issues.length > 0) {
      alerts += 1;
      console.warn(`[alert] ${snapshot.timestamp} :: ${issues.join(", ")}`);
    } else {
      console.log(
        `[ok] ${snapshot.timestamp} :: waiting=${snapshot.queueWaiting} active=${snapshot.queueActive} failed=${snapshot.queueFailed} api_p95=${snapshot.apiP95Ms} api_error=${snapshot.apiErrorRate}`,
      );
    }

    if (i < loops - 1) {
      await delay(intervalSec * 1000);
    }
  }

  console.log(`Hypercare monitoring finalizado. CSV: ${filepath}`);
  console.log(`Total de alertas: ${alerts}`);

  if (failOnAlert && alerts > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
