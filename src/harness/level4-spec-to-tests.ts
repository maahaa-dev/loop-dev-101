import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { callLLM, type LLMConfig } from "./llm.ts";
import { runGate } from "./gate.ts";
import { MAX_ATTEMPTS, extractCode } from "./loop-shared.ts";

const SPEC_FILE = "src/app4/specs.md";
const TEST_FILE = "src/app4/slug.test.ts";
const IMPL_FILE = "src/app4/slug.ts";
const GATE_CMD = `node --import tsx --test ${TEST_FILE}`;

const TEST_WRITER_PROMPT =
  "You are the test-writer. Read the spec and write a thorough test file using node:test and " +
  "node:assert/strict for the described function. Import the implementation with " +
  "`import { slugify } from \"./slug.ts\"`. Cover every rule and example in the spec. Reply with " +
  "ONLY the test file contents in a ts code block. Do NOT write the implementation.";

const MAKER_PROMPT =
  "You are the maker. Write the implementation that satisfies the spec and passes the given tests. " +
  "You may NOT edit the tests. Reply with ONLY the contents of slug.ts in a ts code block.";

/**
 * Level 4: spec-driven, greenfield, TDD. Two independent roles keep the gate
 * honest — a *test-writer* turns the spec into a failing test (RED), then a
 * separate *maker* writes the implementation until that test passes (GREEN).
 * Because the maker only ever writes `slug.ts` and never the test, it can't
 * grade its own homework: the gate is authored from the spec by someone else.
 * The maker loop carries full history (level-2 memory) so it sees every prior
 * failure.
 */
export async function specToTestsLoop(cfg: LLMConfig) {
  // Greenfield: wipe any prior run's generated files so every run starts clean.
  rmSync(TEST_FILE, { force: true });
  rmSync(IMPL_FILE, { force: true });

  const spec = readFileSync(SPEC_FILE, "utf8");

  // Phase 1 — the independent test-writer turns the spec into a test.
  console.log("\n=== test-writer: spec -> failing test ===");
  const testReply = await callLLM(cfg, [
    { role: "system", content: TEST_WRITER_PROMPT },
    { role: "user", content: `Spec:\n${spec}` },
  ]);
  writeFileSync(TEST_FILE, extractCode(testReply));

  // The test must be RED before any implementation exists — prove it.
  const red = runGate(GATE_CMD);
  console.log(red.pass ? "unexpected: test passed with no impl" : "RED confirmed (no implementation yet)");

  // Phase 2 — the maker writes slug.ts, looping until the test passes.
  let history = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n--- maker attempt ${attempt} ---`);
    const reply = await callLLM(cfg, [
      { role: "system", content: MAKER_PROMPT },
      {
        role: "user",
        content: `Spec:\n${spec}\n\nTests you must pass (do not edit them):\n${readFileSync(TEST_FILE, "utf8")}\n\n${history}`,
      },
    ]);
    writeFileSync(IMPL_FILE, extractCode(reply));

    const gate = runGate(GATE_CMD);
    console.log(gate.pass ? "GATE PASS" : "GATE FAIL");
    if (gate.pass) return { attempts: attempt, success: true };

    history += `\n--- attempt ${attempt} failed the gate ---\nTest output:\n${gate.output}\n`;
  }

  return { attempts: MAX_ATTEMPTS, success: false };
}
