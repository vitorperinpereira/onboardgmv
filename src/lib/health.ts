import { env } from "@/lib/env";

const appStart = Date.now();

export function buildHealthPayload() {
  return {
    status: "ok",
    version: env.appVersion,
    uptime_seconds: Math.floor((Date.now() - appStart) / 1000),
    timestamp: new Date().toISOString(),
  };
}
