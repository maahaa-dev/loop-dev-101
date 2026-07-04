import type { LLMConfig } from "./llm.ts";
import { MAX_ATTEMPTS, runMakerStep } from "./loop-shared.ts";

const SYSTEM_PROMPT =
  "You are fixing a TypeScript bug. Reply with ONLY the corrected file contents, in a ts code block.";

/**
 * Level 1 with one change: memory. Instead of overwriting the feedback each
 * attempt, we *append* it, so the maker sees the whole trajectory — not just
 * the last miss.
 *
 * This is the single change the Meta-Harness ablation says matters most: full
 * execution-trace history beat scores-only feedback 50.0 vs 34.6 median
 * accuracy. The body is
 * byte-for-byte level 1's; the only difference is `feedback +=` instead of
 * `feedback =`. One character.
 */
export async function ralphWithMemoryLoop(cfg: LLMConfig, task: string) {
  let feedback = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n--- attempt ${attempt} ---`);
    console.log("maker: writing code");
    const { gate } = await runMakerStep(cfg, SYSTEM_PROMPT, task, feedback);

    console.log(gate.pass ? "gate: PASS" : "gate: FAIL");
    if (gate.pass) return { attempts: attempt, success: true };

    console.log("feedback -> retry");
    feedback += `\n--- attempt ${attempt} failed the gate ---\nTest output:\n${gate.output}\n`;
  }

  return { attempts: MAX_ATTEMPTS, success: false };
}
