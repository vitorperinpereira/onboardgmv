import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/app/api/rateLimit";
import { fromError, ok, withApiMetrics } from "@/app/api/utils";
import { generateStrategicDocuments } from "@/services/documentService";
import { assertAdminRequest } from "@/services/auth";
import { enqueueStrategicDocumentJob } from "@/services/queue";
import { generateDocumentsSchema } from "@/types/domain";

export async function POST(request: NextRequest) {
  return withApiMetrics("/api/documents/generate", async () => {
    const authError = assertAdminRequest(request);
    if (authError) {
      return authError;
    }

    const rateLimited = enforceRateLimit({
      request,
      keyPrefix: "admin-doc-generate",
      limit: 80,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimited) {
      return rateLimited;
    }

    try {
      const payload = generateDocumentsSchema.parse(await request.json());
      const job = await enqueueStrategicDocumentJob({
        sessionId: payload.session_id,
        regenerate: payload.regenerate ?? false,
      });

      if (job) {
        return ok(
          {
            job_id: job.id,
            status: "queued",
          },
          202,
        );
      }

      await generateStrategicDocuments(payload.session_id);

      return ok({
        job_id: null,
        status: "completed_sync",
      });
    } catch (error) {
      return fromError(error);
    }
  });
}
