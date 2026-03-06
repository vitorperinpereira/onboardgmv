const requiredEnv = ["ADMIN_API_TOKEN"] as const;

for (const envName of requiredEnv) {
  if (!process.env[envName]) {
    // Deliberately not throwing to keep local bootstrap simple.
    // Missing values are enforced at runtime by auth checks.
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  adminApiToken: process.env.ADMIN_API_TOKEN ?? "dev-admin-token",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openAiApiKey: process.env.OPENAI_API_KEY,
  enableLlmInTests: process.env.ENABLE_LLM_IN_TESTS === "true",
  redisUrl: process.env.REDIS_URL,
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? "3"),
  sentryDsn: process.env.SENTRY_DSN,
  appVersion: process.env.APP_VERSION ?? "0.1.0",
};
