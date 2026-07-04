# loop-dev-101

Glossary for the minimal agentic-loop demo used in the "build your own loop harness" talk. Terms
below are deliberately consistent with the sibling `chakravyuh` project's glossary. This demo is a
stripped-down teaching version of the same idea, not a competing vocabulary.

## Language

**Gate**:
The deterministic pass/fail check (here: `npm test`, a `node --test` run) whose exit code decides
whether an attempt is accepted. Never overridden by an LLM's own opinion of its work.

**Maker**:
The LLM call that writes/rewrites the target file to satisfy the task.

**Checker**:
Level-3 only. An LLM call that judges the maker's code strictly against the task spec, read-only.
Runs only after the gate has already passed.

**Reviewer**:
Level-3 only. A second, independent LLM call judging code quality/correctness. Kept separate from
the checker so no single judgment call decides acceptance alone. Independence is the point, not the
prompt wording.

**Verdict**:
A checker's or reviewer's `{ pass, reply }` judgment, parsed from a `PASS` / `FAIL: <reason>` reply.

**Attempt**:
One full maker → gate (→ checker/reviewer) cycle. Bounded by `MAX_ATTEMPTS`; the loop gives up after
that many rather than retrying forever.

**Ralph loop** (level 1):
The dumbest version of the loop: one maker, one gate, retry with the last gate failure as feedback,
up to the attempt cap. No independent judgment of "good code," only "does it pass." Named after the
"Ralph Wiggum technique" (Geoffrey Huntley): loop a coding agent against the same task, trusting the
process rather than babysitting each step.

**Provider shim**:
`callLLM(cfg, messages)` in `src/harness/llm.ts`, a single OpenAI-compatible `/chat/completions` call.
Swapping `baseURL` / `apiKey` / `model` retargets OpenAI, Groq, DeepSeek, Together, OpenRouter, or a
local Ollama server unchanged, because they all speak the same request/response shape. Anthropic and
Google don't (different message/tool shape). A real per-provider adapter (see `pi`'s
`packages/ai/src/providers/`) is out of scope for this demo; it's mentioned only verbally in the talk.
