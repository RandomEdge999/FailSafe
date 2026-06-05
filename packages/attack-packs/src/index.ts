import { ScenarioPackSchema } from "@failsafe/schemas";
import { approvalBypassPack } from "./approval-bypass";
import { indirectPromptInjectionPack } from "./indirect-prompt-injection";
import { toolPoisoningPack } from "./tool-poisoning";

export { approvalBypassPack } from "./approval-bypass";
export { indirectPromptInjectionPack } from "./indirect-prompt-injection";
export { toolPoisoningPack } from "./tool-poisoning";

export const starterAttackPacks = ScenarioPackSchema.array().parse([
  toolPoisoningPack,
  indirectPromptInjectionPack,
  approvalBypassPack
]);
