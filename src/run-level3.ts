import { makerCheckerReviewerLoop } from "./harness/level3-maker-checker-reviewer.ts";
import { loadLLMConfig, TASK } from "./harness/loop-shared.ts";

const cfg = loadLLMConfig();
const result = await makerCheckerReviewerLoop(cfg, TASK);
console.log("\nresult:", result);
