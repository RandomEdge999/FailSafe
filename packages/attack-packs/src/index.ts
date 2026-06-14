import { ScenarioPackSchema } from "@failsafe/schemas";
import { approvalBypassPack } from "./approval-bypass";
import { dataExfiltrationPack } from "./data-exfiltration";
import { indirectPromptInjectionPack } from "./indirect-prompt-injection";
import { toolOutputInjectionPack } from "./tool-output-injection";
import { toolPoisoningPack } from "./tool-poisoning";

export { approvalBypassPack } from "./approval-bypass";
export { dataExfiltrationPack } from "./data-exfiltration";
export { indirectPromptInjectionPack } from "./indirect-prompt-injection";
export { toolOutputInjectionPack } from "./tool-output-injection";
export { toolPoisoningPack } from "./tool-poisoning";

export const starterAttackPacks = ScenarioPackSchema.array().parse([
  toolPoisoningPack,
  indirectPromptInjectionPack,
  approvalBypassPack,
  toolOutputInjectionPack,
  dataExfiltrationPack
]);
