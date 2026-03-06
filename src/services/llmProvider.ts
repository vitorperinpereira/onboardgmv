import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { env } from "@/lib/env";

let model: ChatOpenAI | null = null;

export function getLlmModel() {
  if (env.nodeEnv === "test" && !env.enableLlmInTests) {
    return null;
  }

  if (!env.openAiApiKey) {
    return null;
  }

  if (!model) {
    model = new ChatOpenAI({
      apiKey: env.openAiApiKey,
      model: "gpt-4o-mini",
      temperature: 0.2,
    });
  }

  return model;
}

export function isLlmEnabled() {
  return Boolean(getLlmModel());
}

export async function invokeStructuredLlm<TSchema extends z.ZodTypeAny>(input: {
  schema: TSchema;
  instructions: string;
  context: string;
}) {
  const llmModel = getLlmModel();
  if (!llmModel) {
    return null as z.infer<TSchema> | null;
  }

  try {
    const structuredModel = llmModel.withStructuredOutput(input.schema);
    const response = await structuredModel.invoke(
      [
        "SISTEMA:",
        input.instructions,
        "",
        "CONTEXTO:",
        input.context,
      ].join("\n"),
    );

    const parsed = input.schema.safeParse(response);
    if (!parsed.success) {
      return null as z.infer<TSchema> | null;
    }

    return parsed.data as z.infer<TSchema>;
  } catch {
    return null as z.infer<TSchema> | null;
  }
}
