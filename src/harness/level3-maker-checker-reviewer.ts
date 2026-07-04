import { callLLM, type LLMConfig } from "./llm.ts";
import { MAX_ATTEMPTS, modelForRole, runMakerStep } from "./loop-shared.ts";

const MAKER_SYSTEM_PROMPT = "You are the maker. Reply with ONLY the corrected file contents, in a ts code block.";

/**
 * Asks a single independent LLM call to judge already-gate-passing code
 * against the task, playing the given role. Checker and reviewer both call
 * this with different role text so neither one's prompt wording, alone,
 * decides acceptance.
 *
 * Verdict parsing takes the LAST PASS/FAIL token in the reply. A thinking
 * model restates the instruction ("reply PASS or FAIL") inside its reasoning,
 * so both words appear — but the model's actual conclusion is whichever it
 * writes last. "Contains PASS" or "starts with PASS" both misfire on that;
 * last-token-wins survives it. A structured-output/JSON-schema verdict is the
 * production-grade fix; this keeps the demo one function.
 */
async function vote(
  cfg: LLMConfig,
  role: string,
  model: string,
  task: string,
  code: string
): Promise<{ pass: boolean; reply: string }> {
  const reply = await callLLM(
    cfg,
    [
      {
        role: "system",
        content: `You are the ${role}. Judge whether the code satisfies the task. End your reply with a line that is exactly "PASS" or "FAIL: <reason>".`,
      },
      { role: "user", content: `Task: ${task}\n\nCode:\n${code}` },
    ],
    model
  );

  const tokens = reply.toUpperCase().match(/PASS|FAIL/g) ?? [];
  const pass = tokens[tokens.length - 1] === "PASS";
  return { pass, reply: reply.trim() };
}

/**
 * Level 1's maker+gate step, plus a vote: a gate pass alone isn't enough
 * here, an independent checker and reviewer both have to agree before an
 * attempt is accepted. Either the gate or a vote failing sends the same
 * kind of feedback back to the maker for the next attempt.
 */
export async function makerCheckerReviewerLoop(cfg: LLMConfig, task: string) {
  let feedback = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n--- attempt ${attempt} ---`);
    const { code, gate } = await runMakerStep(cfg, MAKER_SYSTEM_PROMPT, task, feedback);

    if (!gate.pass) {
      console.log("GATE FAIL");
      feedback = `Gate (tests) failed:\n${gate.output}\nFix it.`;
      continue;
    }
    console.log("GATE PASS - asking checker + reviewer");

    const [checker, reviewer] = await Promise.all([
      vote(cfg, "checker, verifying strictly against the task spec", modelForRole("checker", cfg.model), task, code),
      vote(cfg, "reviewer, judging code quality independently", modelForRole("reviewer", cfg.model), task, code),
    ]);

    if (checker.pass && reviewer.pass) {
      console.log("CHECKER PASS, REVIEWER PASS - accepted");
      return { attempts: attempt, success: true };
    }

    console.log("CHECKER/REVIEWER REJECTED");
    feedback = `Gate passed but was rejected:\nChecker: ${checker.pass ? "pass" : checker.reply}\nReviewer: ${reviewer.pass ? "pass" : reviewer.reply}\nFix it.`;
  }

  return { attempts: MAX_ATTEMPTS, success: false };
}
