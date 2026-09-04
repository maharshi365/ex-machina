import { z } from "zod";

export const HarnessDefinitionSchema = z.strictObject({
  type: z.literal("opencode"),
  version: z.literal(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type HarnessDefinition = z.infer<typeof HarnessDefinitionSchema>;
