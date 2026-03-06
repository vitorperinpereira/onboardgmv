import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/app/api/rateLimit";
import { fail, fromError, ok, withApiMetrics } from "@/app/api/utils";
import { getStrategicDocuments } from "@/services/documentService";
import { assertAdminRequest } from "@/services/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ session_id: string }> },
) {
  return withApiMetrics("/api/documents/[session_id]", async () => {
    const authError = assertAdminRequest(request);
    if (authError) {
      return authError;
    }

    const rateLimited = enforceRateLimit({
      request,
      keyPrefix: "admin-doc-read",
      limit: 220,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimited) {
      return rateLimited;
    }

    try {
      const { session_id } = await context.params;
      const documents = await getStrategicDocuments(session_id);

      if (!documents) {
        return fail(404, "not_found", "Documentos estrategicos nao encontrados");
      }

      return ok(documents);
    } catch (error) {
      return fromError(error);
    }
  });
}
