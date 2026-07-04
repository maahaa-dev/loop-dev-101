import type { LLMConfig } from "./llm.ts";
import { MAX_ATTEMPTS, runMakerStep } from "./loop-shared.ts";

const SYSTEM_PROMPT =
  "You are fixing a TypeScript bug. Reply with ONLY the corrected file contents, in a ts code block.";

/**
 * The "Ralph Wiggum technique" (Geoffrey Huntley): one maker, one gate, retry
 * with the last gate failure as feedback. No independent judgment of "good
 * code" — only "does it pass." Level 3 adds that judgment without changing
 * this shape.
 *
 * The body is deliberately identical to level 2's except for one character:
 * here `feedback =` *overwrites* (only the last failure survives); level 2
 * uses `+=` to accumulate the whole history.
 */
export async function ralphLoop(cfg: LLMConfig, task: string) {
  let feedback = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n--- attempt ${attempt} ---`);
    console.log("maker: writing code");
    const { gate } = await runMakerStep(cfg, SYSTEM_PROMPT, task, feedback);

    console.log(gate.pass ? "gate: PASS" : "gate: FAIL");
    if (gate.pass) return { attempts: attempt, success: true };

    console.log("feedback -> retry");
    feedback = `\n--- attempt ${attempt} failed the gate ---\nTest output:\n${gate.output}\n`;
  }

  return { attempts: MAX_ATTEMPTS, success: false };
}
