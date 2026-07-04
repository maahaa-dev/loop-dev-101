import { ralphLoop } from "./harness/level1-ralph-loop.ts";
import { loadLLMConfig, TASK } from "./harness/loop-shared.ts";

const cfg = loadLLMConfig();
const result = await ralphLoop(cfg, TASK);
console.log("\nresult:", result);
