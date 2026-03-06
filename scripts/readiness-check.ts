import { access } from "fs/promises";

type CheckResult = {
  name: string;
  status: "PASS" | "WARN" | "FAIL";
  details: string;
};

async function checkFile(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function checkEndpoint(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, { headers });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

function print(results: CheckResult[]) {
  console.log("\nReadiness report:\n");
  for (const result of results) {
    console.log(`[${result.status}] ${result.name} - ${result.details}`);
  }
  console.log();
}

async function main() {
  const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
  const adminToken = process.env.ADMIN_API_TOKEN ?? "";
  const strictEnv = process.env.READINESS_STRICT_ENV === "true";

  const results: CheckResult[] = [];

  const requiredEnv = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "REDIS_URL",
    "ADMIN_API_TOKEN",
  ] as const;

  for (const key of requiredEnv) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      results.push({
        name: `env:${key}`,
        status: "PASS",
        details: "configured",
      });
    } else {
      results.push({
        name: `env:${key}`,
        status: strictEnv ? "FAIL" : "WARN",
        details: strictEnv ? "missing (strict mode)" : "missing (non-strict mode)",
      });
    }
  }

  const health = await checkEndpoint(`${baseUrl}/api/health`);
  if (health.status === 200 && health.data?.status === "ok") {
    results.push({
      name: "endpoint:/api/health",
      status: "PASS",
      details: "healthy",
    });
  } else {
    results.push({
      name: "endpoint:/api/health",
      status: "FAIL",
      details: `unexpected status ${health.status}`,
    });
  }

  if (adminToken) {
    const metrics = await checkEndpoint(`${baseUrl}/api/admin/metrics`, {
      "x-admin-token": adminToken,
    });

    if (metrics.status === 200) {
      const hasQueue = typeof metrics.data?.queue?.waiting === "number";
      const hasApiLatency = typeof metrics.data?.api?.overall?.p95_ms === "number";
      const hasApiErrorRate = typeof metrics.data?.api?.overall?.error_rate === "number";

      results.push({
        name: "endpoint:/api/admin/metrics",
        status: hasQueue && hasApiLatency && hasApiErrorRate ? "PASS" : "WARN",
        details:
          hasQueue && hasApiLatency && hasApiErrorRate
            ? "authorized and reachable with queue/api metrics"
            : "authorized and reachable but metrics payload is partial",
      });
    } else {
      results.push({
        name: "endpoint:/api/admin/metrics",
        status: "FAIL",
        details: `unexpected status ${metrics.status}`,
      });
    }
  } else {
    results.push({
      name: "endpoint:/api/admin/metrics",
      status: "WARN",
      details: "ADMIN_API_TOKEN not set for readiness request",
    });
  }

  const requiredDocs = [
    "docs/runbook-operacional.md",
    "docs/readiness-checklist.md",
    "docs/rollback-plan.md",
    "docs/hypercare-playbook.md",
    "docs/uat-plan.md",
  ];

  for (const doc of requiredDocs) {
    const exists = await checkFile(doc);
    results.push({
      name: `doc:${doc}`,
      status: exists ? "PASS" : "FAIL",
      details: exists ? "present" : "missing",
    });
  }

  print(results);

  const failed = results.filter((result) => result.status === "FAIL");
  if (failed.length > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
