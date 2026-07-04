import { ralphWithMemoryLoop } from "./harness/level2-ralph-with-memory.ts";
import { loadLLMConfig, TASK } from "./harness/loop-shared.ts";

const cfg = loadLLMConfig();
const result = await ralphWithMemoryLoop(cfg, TASK);
console.log("\nresult:", result);
