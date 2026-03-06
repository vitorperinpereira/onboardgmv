import { randomUUID } from "crypto";
import { evaluateSpecificityAgent } from "@/agents/evaluateSpecificity";
import { getRepository } from "@/repositories";
import { onboardingSteps, OnboardingStep } from "@/types/domain";

const MAX_GENERIC_ATTEMPTS_BEFORE_UNLOCK = 1;
const MIN_UNLOCK_RESPONSE_LENGTH = 90;

function nextStep(current: OnboardingStep): OnboardingStep | null {
  const index = onboardingSteps.indexOf(current);
  if (index === -1 || index === onboardingSteps.length - 1) {
    return null;
  }
  return onboardingSteps[index + 1];
}

function getCurrentStep(answered: OnboardingStep[]): OnboardingStep {
  for (const step of onboardingSteps) {
    if (!answered.includes(step)) {
      return step;
    }
  }

  return onboardingSteps[onboardingSteps.length - 1];
}

export async function createOnboardingSession(input: {
  client_name: string;
  clinic_name: string;
  email: string;
}) {
  const repository = getRepository();
  const token = randomUUID();

  const bundle = await repository.createSession({
    ...input,
    token,
  });

  return {
    session_id: bundle.session.id,
    token: bundle.session.token,
    status: bundle.session.status,
  };
}

export async function getOnboardingSessionByToken(token: string) {
  const repository = getRepository();
  const bundle = await repository.getSessionByToken(token);

  if (!bundle) {
    return null;
  }

  const responses = await repository.listResponsesBySession(bundle.session.id);
  const acceptedSteps = Array.from(
    new Set(responses.filter((response) => !response.is_partial).map((response) => response.step)),
  );

  const currentStep =
    bundle.session.status === "completed" ? null : getCurrentStep(acceptedSteps as OnboardingStep[]);

  return {
    session: bundle.session,
    client: bundle.client,
    current_step: currentStep,
    progress: Math.round((acceptedSteps.length / onboardingSteps.length) * 100),
  };
}

export async function submitOnboardingAnswer(input: {
  token: string;
  step: OnboardingStep;
  answers: { response: string };
}) {
  const repository = getRepository();
  const bundle = await repository.getSessionByToken(input.token);

  if (!bundle) {
    return null;
  }

  const existingResponses = await repository.listResponsesBySession(bundle.session.id);
  const historyForStep = existingResponses
    .filter((response) => response.step === input.step)
    .map((response) => String(response.answers.response ?? ""));

  const specificity = await evaluateSpecificityAgent({
    step: input.step,
    current_answer: input.answers.response,
    step_history: historyForStep,
  });

  const responseLength = input.answers.response.trim().length;
  const shouldUnlockStep =
    specificity.is_generic &&
    historyForStep.length >= MAX_GENERIC_ATTEMPTS_BEFORE_UNLOCK &&
    responseLength >= MIN_UNLOCK_RESPONSE_LENGTH;

  const finalSpecificity = shouldUnlockStep
    ? {
        ...specificity,
        is_generic: false,
        specificity_score: Math.max(specificity.specificity_score, 7),
      }
    : specificity;

  await repository.upsertResponse({
    session_id: bundle.session.id,
    step: input.step,
    answers: input.answers,
    specificity_score: finalSpecificity.specificity_score,
    is_partial: finalSpecificity.is_generic,
  });

  await repository.addMessage({
    session_id: bundle.session.id,
    step: input.step,
    role: "user",
    content: input.answers.response,
  });

  if (finalSpecificity.is_generic) {
    await repository.addMessage({
      session_id: bundle.session.id,
      step: input.step,
      role: "assistant",
      content: finalSpecificity.followups.join(" "),
    });

    return {
      accepted: false,
      specificity_score: finalSpecificity.specificity_score,
      followups: finalSpecificity.followups,
      next_step: input.step,
    };
  }

  const upcomingStep = nextStep(input.step);

  if (!upcomingStep) {
    const nonPartial = [...existingResponses, { specificity_score: finalSpecificity.specificity_score, is_partial: false }]
      .filter((response) => !response.is_partial)
      .map((response) => response.specificity_score);

    const maturityScore =
      nonPartial.length === 0
        ? finalSpecificity.specificity_score
        : Number((nonPartial.reduce((a, b) => a + b, 0) / nonPartial.length).toFixed(1));

    await repository.completeSession(bundle.session.id, maturityScore);
  }

  return {
    accepted: true,
    specificity_score: finalSpecificity.specificity_score,
    followups: [],
    next_step: upcomingStep,
    accepted_with_relaxation: shouldUnlockStep,
  };
}
