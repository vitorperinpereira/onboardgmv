import { Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { cleanupExpiredDocumentCache, generateStrategicDocuments } from "@/services/documentService";
import { getOperationalMetrics } from "@/services/metricsService";
import { pruneApiMetrics } from "@/services/observability";
import {
  getMaintenanceQueueName,
  getStrategicQueueName,
  MaintenanceJob,
  StrategicDocumentJob,
} from "@/services/queue";

const DEFAULT_MAINTENANCE_API_METRICS_TTL_MS = 24 * 60 * 60 * 1000;

function withWorkerLogging<TJob>(worker: Worker<TJob>, workerName: string) {
  worker.on("failed", (job, error) => {
    logger.error({ workerName, jobId: job?.id, error }, "Job failed");
  });

  worker.on("completed", (job) => {
    logger.info({ workerName, jobId: job.id }, "Job completed");
  });
}

async function bootstrapWorker() {
  if (!env.redisUrl) {
    logger.warn("REDIS_URL ausente; worker nao iniciado.");
    return;
  }

  const strategicConnection = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
  });

  const maintenanceConnection = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
  });

  const strategicWorker = new Worker<StrategicDocumentJob>(
    getStrategicQueueName(),
    async (job) => {
      logger.info({ jobId: job.id, sessionId: job.data.sessionId }, "Processing strategic document job");
      await generateStrategicDocuments(job.data.sessionId);
      return { ok: true };
    },
    {
      connection: strategicConnection,
      concurrency: env.workerConcurrency,
    },
  );

  const maintenanceWorker = new Worker<MaintenanceJob>(
    getMaintenanceQueueName(),
    async (job) => {
      switch (job.data.type) {
        case "snapshot_operational_metrics": {
          const metrics = await getOperationalMetrics();
          logger.info(
            {
              reason: job.data.reason,
              sessions: metrics.sessions,
              queue: metrics.queue,
            },
            "Snapshot operacional atualizado",
          );
          return { ok: true, type: job.data.type };
        }
        case "cleanup_document_cache": {
          const result = cleanupExpiredDocumentCache();
          logger.info(
            {
              reason: job.data.reason,
              ...result,
            },
            "Cache de documentos limpo",
          );
          return { ok: true, type: job.data.type };
        }
        case "prune_api_metrics": {
          const pruned = pruneApiMetrics(job.data.maxAgeMs || DEFAULT_MAINTENANCE_API_METRICS_TTL_MS);
          logger.info(
            {
              reason: job.data.reason,
              ...pruned,
            },
            "Amostras antigas de metricas da API removidas",
          );
          return { ok: true, type: job.data.type };
        }
        default: {
          const exhaustiveCheck: never = job.data;
          throw new Error(`Tipo de job nao suportado: ${JSON.stringify(exhaustiveCheck)}`);
        }
      }
    },
    {
      connection: maintenanceConnection,
      concurrency: 1,
    },
  );

  withWorkerLogging(strategicWorker, "strategic");
  withWorkerLogging(maintenanceWorker, "maintenance");

  logger.info("Workers online");
}

bootstrapWorker().catch((error) => {
  logger.error({ error }, "Worker bootstrap failed");
  process.exit(1);
});
