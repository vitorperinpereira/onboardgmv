import { logger } from "@/lib/logger";
import { enqueueMaintenanceJob, hasQueueConfigured } from "@/services/queue";

const SNAPSHOT_INTERVAL_MS = 15_000;
const HOUSEKEEPING_INTERVAL_MS = 60_000;
const DEFAULT_API_METRICS_TTL_MS = 24 * 60 * 60 * 1000;

let lastSnapshotAt = 0;
let lastHousekeepingAt = 0;

function safeEnqueue(job: Parameters<typeof enqueueMaintenanceJob>[0]) {
  if (!hasQueueConfigured()) {
    return;
  }

  void enqueueMaintenanceJob(job).catch((error) => {
    logger.warn(
      {
        jobType: job.type,
        error,
      },
      "Nao foi possivel enfileirar tarefa de manutencao",
    );
  });
}

export function scheduleMetricsSnapshot(reason: string) {
  const now = Date.now();
  if (now - lastSnapshotAt < SNAPSHOT_INTERVAL_MS) {
    return;
  }

  lastSnapshotAt = now;
  safeEnqueue({
    type: "snapshot_operational_metrics",
    reason,
  });
}

export function scheduleHousekeeping(reason: string) {
  const now = Date.now();
  if (now - lastHousekeepingAt < HOUSEKEEPING_INTERVAL_MS) {
    return;
  }

  lastHousekeepingAt = now;

  safeEnqueue({
    type: "cleanup_document_cache",
    reason,
  });

  safeEnqueue({
    type: "prune_api_metrics",
    reason,
    maxAgeMs: DEFAULT_API_METRICS_TTL_MS,
  });
}
