import { env } from "@/lib/env";
import { InMemoryOnboardingRepository } from "@/repositories/inMemoryRepository";
import { OnboardingRepository } from "@/repositories/interfaces";
import { SupabaseOnboardingRepository } from "@/repositories/supabaseRepository";

let singleton: OnboardingRepository | null = null;

export function getRepository(): OnboardingRepository {
  if (!singleton) {
    const shouldUseSupabase = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
    singleton = shouldUseSupabase
      ? new SupabaseOnboardingRepository()
      : new InMemoryOnboardingRepository();
  }

  return singleton;
}

export function setRepository(repository: OnboardingRepository) {
  singleton = repository;
}

export function resetRepository() {
  singleton = null;
}
