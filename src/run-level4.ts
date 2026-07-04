import { specToTestsLoop } from "./harness/level4-spec-to-tests.ts";
import { loadLLMConfig } from "./harness/loop-shared.ts";

const cfg = loadLLMConfig();
const result = await specToTestsLoop(cfg);
console.log("\nresult:", result);
