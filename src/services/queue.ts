import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export type StrategicDocumentJob = {
  sessionId: string;
  regenerate: boolean;
};

export type MaintenanceJob =
  | {
      type: "snapshot_operational_metrics";
      reason: string;
    }
  | {
      type: "cleanup_document_cache";
      reason: string;
    }
  | {
      type: "prune_api_metrics";
      reason: string;
      maxAgeMs: number;
    };

type QueueCounts = {
  configured: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
};

const strategicQueueName = "strategic-documents";
const maintenanceQueueName = "ops-maintenance";

let strategicQueue: Queue<StrategicDocumentJob> | null = null;
let maintenanceQueue: Queue<MaintenanceJob> | null = null;

function createConnection() {
  return new IORedis(env.redisUrl!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

function getStrategicQueue() {
  if (!env.redisUrl) {
    return null;
  }

  if (!strategicQueue) {
    const connection = createConnection();

    strategicQueue = new Queue<StrategicDocumentJob>(strategicQueueName, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    logger.info({ queueName: strategicQueueName }, "BullMQ queue initialized");
  }

  return strategicQueue;
}

function getMaintenanceQueue() {
  if (!env.redisUrl) {
    return null;
  }

  if (!maintenanceQueue) {
    const connection = createConnection();

    maintenanceQueue = new Queue<MaintenanceJob>(maintenanceQueueName, {
      connection,
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    logger.info({ queueName: maintenanceQueueName }, "BullMQ queue initialized");
  }

  return maintenanceQueue;
}

async function getQueueMetrics<TJob extends object>(
  queue: Queue<TJob> | null,
): Promise<QueueCounts> {
  if (!queue) {
    return {
      configured: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    };
  }

  const counts = await queue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
    "paused",
  );

  return {
    configured: true,
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    delayed: counts.delayed ?? 0,
    paused: counts.paused ?? 0,
  };
}

export async function enqueueStrategicDocumentJob(input: StrategicDocumentJob) {
  const q = getStrategicQueue();
  if (!q) {
    return null;
  }

  const job = await q.add("generate-documents", input);
  return job;
}

export function hasQueueConfigured() {
  return Boolean(env.redisUrl);
}

export function getStrategicQueueName() {
  return strategicQueueName;
}

export async function enqueueMaintenanceJob(input: MaintenanceJob) {
  const q = getMaintenanceQueue();
  if (!q) {
    return null;
  }

  const job = await q.add(input.type, input);
  return job;
}

export function getMaintenanceQueueName() {
  return maintenanceQueueName;
}

export async function getStrategicQueueMetrics() {
  return getQueueMetrics(getStrategicQueue());
}

export async function getMaintenanceQueueMetrics() {
  return getQueueMetrics(getMaintenanceQueue());
}
