import { starterAttackPacks } from "@failsafe/attack-packs";
import { calculateCrashScore } from "@failsafe/scoring-engine";
import { ScenarioPackSchema } from "@failsafe/schemas";

const parsedPacks = ScenarioPackSchema.array().parse(starterAttackPacks);
const score = calculateCrashScore({
  attackSuccessRate: 0.5,
  taskUtility: 0.8,
  severity: 0.6,
  scopeBreach: 0.3,
  repeatabilityPenalty: 0.2,
  explanationConfidence: 0.9
});

if (parsedPacks.length !== 3) {
  throw new Error(`Expected 3 starter attack packs, found ${parsedPacks.length}.`);
}

if (score.overall < 0 || score.overall > 100) {
  throw new Error(`Crash score outside expected range: ${score.overall}.`);
}

console.log(
  `FailSafe dev check passed: ${parsedPacks.length} packs, demo score ${score.overall}.`
);
