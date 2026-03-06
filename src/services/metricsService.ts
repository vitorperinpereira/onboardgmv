import { getRepository } from "@/repositories";
import { getApiMetricsSummary } from "@/services/observability";
import { getMaintenanceQueueMetrics, getStrategicQueueMetrics } from "@/services/queue";

export async function getOperationalMetrics() {
  const repository = getRepository();
  const sessions = await repository.listSessions();
  const queue = await getStrategicQueueMetrics();
  const maintenanceQueue = await getMaintenanceQueueMetrics();

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((bundle) => bundle.session.status === "completed").length;
  const inProgressSessions = totalSessions - completedSessions;

  const completionRate =
    totalSessions === 0 ? 0 : Number(((completedSessions / totalSessions) * 100).toFixed(2));

  return {
    generated_at: new Date().toISOString(),
    sessions: {
      total: totalSessions,
      completed: completedSessions,
      in_progress: inProgressSessions,
      completion_rate: completionRate,
    },
    queue,
    maintenance_queue: maintenanceQueue,
    api: getApiMetricsSummary(),
  };
}
