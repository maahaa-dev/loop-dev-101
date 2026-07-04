import { readFileSync, writeFileSync } from "node:fs";
import { callLLM, type LLMConfig } from "./llm.ts";
import { runGate, type GateResult } from "./gate.ts";

const TARGET_FILE = "src/app/pricing.ts";
const GATE_CMD = "npm test";

/**
 * Hard cap on retries per loop run. Without it a maker that never satisfies
 * the gate would retry forever, silently burning tokens on stage.
 */
export const MAX_ATTEMPTS = 5;

/**
 * The one task both level 1 and level 3 demo against, so a change to the
 * wording can't drift between the two entry points.
 */
export const TASK =
  "Fix calculateTotal in src/app/pricing.ts: discount tiers must be inclusive of their boundary " +
  "(quantity >= 10 gets 10% off, quantity >= 50 gets 20% off). Do not change the function signature.";

/**
 * Pulls the code out of a maker's reply. Models are asked for a single ts
 * code block but don't always comply, so a reply with no fenced block falls
 * back to using the raw text as-is rather than throwing — a malformed reply
 * should fail the gate on the next run, not crash the loop.
 */
export function extractCode(text: string): string {
  const match = text.match(/```(?:ts|typescript)?\r?\n([\s\S]*?)```/);
  return (match?.[1] ?? text).trim();
}

/**
 * Reads the LLM connection details from the environment and fails with a
 * pointer to `.env.example` instead of letting a missing key surface later
 * as an opaque fetch error deep inside callLLM. `cfg.model` is the maker /
 * default model (`LLM_MODEL_MAKER`, falling back to `LLM_MODEL`).
 */
export function loadLLMConfig(): LLMConfig {
  const baseURL = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL_MAKER || process.env.LLM_MODEL;

  if (!baseURL || !apiKey || !model) {
    throw new Error(
      "Missing LLM config. Copy .env.example to .env and fill in LLM_BASE_URL / LLM_API_KEY / LLM_MODEL."
    );
  }

  return { baseURL, apiKey, model };
}

/**
 * The model to use for a given role, so level 3 can run a cheap checker and a
 * thinking reviewer on different models than the maker. Falls back to the
 * maker/default model when a role-specific override isn't set.
 */
export function modelForRole(role: "checker" | "reviewer", fallback: string): string {
  const env = role === "checker" ? process.env.LLM_MODEL_CHECKER : process.env.LLM_MODEL_REVIEWER;
  return env || fallback;
}

/**
 * The one step every loop shape in this repo is built from: ask the maker to
 * rewrite the target file, then run the gate against the result. Level 1
 * stops here; level 3 wraps this same step with a checker/reviewer vote —
 * neither loop re-implements the read/call/write/gate sequence on its own.
 */
export async function runMakerStep(
  cfg: LLMConfig,
  systemPrompt: string,
  task: string,
  feedback: string
): Promise<{ code: string; gate: GateResult }> {
  const current = readFileSync(TARGET_FILE, "utf8");

  const reply = await callLLM(cfg, [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Task: ${task}\n\nCurrent file (${TARGET_FILE}):\n${current}\n\n${feedback}`,
    },
  ]);

  const code = extractCode(reply);
  writeFileSync(TARGET_FILE, code);

  return { code, gate: runGate(GATE_CMD) };
}
