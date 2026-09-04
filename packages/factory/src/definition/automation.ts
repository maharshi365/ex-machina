import { z } from "zod";
import { ExecutionOverridesSchema } from "../execution/index.js";
import { GithubTriggerSchema } from "./github-trigger.js";

export const FactoryTriggerSchema = GithubTriggerSchema;
export type FactoryTrigger = z.infer<typeof FactoryTriggerSchema>;

export const FactoryAutomationSchema = z.strictObject({
  key: z.string().trim().min(1),
  name: z.string().trim().min(1),
  enabled: z.boolean(),
  agentKey: z.string().trim().min(1),
  repositoryKeys: z.array(z.string().trim().min(1)),
  skillIds: z.array(z.string().trim().min(1)).default([]),
  initialPrompt: z.string().optional(),
  /** Any matching trigger starts the automation. */
  triggers: z.array(FactoryTriggerSchema),
  execution: ExecutionOverridesSchema.optional(),
});

export type FactoryAutomation = z.infer<typeof FactoryAutomationSchema>;
