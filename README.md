# loop-dev-101

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Minimal agentic-loop demo. One buggy pricing function, one failing test suite as the gate, four
loop shapes (naive Ralph → memory → jury → spec-driven TDD) around one tiny provider-agnostic LLM call.

Companion repo for a ~40 min talk on how agentic coding loops actually work. Every level is a few
dozen lines you can read top to bottom — the point is that the loop shape, not the model, does the work.

## Layout

- `src/harness/` — the loop machinery: `llm.ts` (provider shim), `gate.ts` (pass/fail check),
  `loop-shared.ts` (shared maker step, config, task), and the four loop shapes themselves.
- `src/app/` — the level 1-3 target: `pricing.ts` (buggy), `pricing.buggy.ts` (pristine copy for
  reset), `pricing.test.ts` (the gate's test file). Swappable for any other small bug.
- `src/app4/` — the level 4 greenfield target: `specs.md` + `backlog.md` (source of truth); the loop
  *generates* `slug.test.ts` and `slug.ts` here (both gitignored — regenerated each run).
- `src/run-level1.ts` … `src/run-level4.ts` — entry points.

## Setup

Requires **Node ≥ 20.6** (uses `--env-file` and the built-in test runner). No other global tooling.

```bash
npm install
cp .env.example .env   # fill in LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
```

Any OpenAI-`/chat/completions`-compatible endpoint works: OpenAI, Groq, DeepSeek, Together,
OpenRouter, or a local Ollama server. Anthropic/Google need a real adapter, not this demo. See
`CONTEXT.md`.

**Per-role models (optional).** The maker, checker, and reviewer can each run a different model over
the same endpoint and key — set `LLM_MODEL_MAKER`, `LLM_MODEL_CHECKER`, `LLM_MODEL_REVIEWER`. Any role
left unset falls back to `LLM_MODEL`. The committed `.env.example` runs a strong maker (`z-ai/glm-5.2`),
a cheap fast checker (`deepseek/deepseek-v4-flash`), and a thinking reviewer (`moonshotai/kimi-k2-thinking`).

## The bug

`src/app/pricing.ts` (`calculateTotal`) has an off-by-one on its discount tiers: `quantity > 10`
instead of `>= 10`, so buying exactly 10 or 50 units doesn't get the discount it should.
`src/app/pricing.test.ts` encodes the correct, inclusive boundary. 2 of 4 tests fail against the
buggy code.

```bash
npm test      # confirm: 2 pass, 2 fail
npm run reset # restore the buggy version before each demo run
```

## Level 1 — Ralph loop

`src/harness/level1-ralph-loop.ts`: one maker, one gate, retry with the last failure as feedback,
capped at 5 attempts. No judgment of "good code," only "does it pass."

```bash
npm run level1
```

## Level 2 — Ralph with memory

`src/harness/level2-ralph-with-memory.ts`: level 1 with one character changed — `+=` instead of `=`.
The feedback *accumulates* every failed attempt's full test output instead of keeping only the last,
so the maker sees the whole trajectory. This is the single change the Meta-Harness ablation says
matters most (full trace history 50.0 vs scores-only 34.6). Same loop shape as level 1 — the diff *is*
the lesson.

```bash
npm run level2
```

## Level 3 — maker + checker + reviewer

`src/harness/level3-maker-checker-reviewer.ts`: level 1's maker+gate step, plus a vote. A gate pass now
also needs two independent LLM votes (checker against spec, reviewer against quality) before being
accepted. Either vote fails → feedback goes back to the maker, same as a gate failure. The two votes
run concurrently and can each use a different model (see per-role models above) — a cheap checker and
a stronger/thinking reviewer.

```bash
npm run level3
```

## Level 4 — spec → test → impl (greenfield, TDD)

`src/harness/level4-spec-to-tests.ts`: no starting code at all. Two independent roles keep the gate
honest — a **test-writer** turns `src/app4/specs.md` into a failing test (RED), then a separate
**maker** writes `slug.ts` until that test passes (GREEN). The maker never writes the test, so it
can't grade its own homework: the gate is authored from the spec by someone else. Reuses level 2's
memory (the maker sees every prior failure).

```bash
npm run level4    # generates src/app4/slug.test.ts then src/app4/slug.ts
npm run reset4    # delete the generated files (each run regenerates anyway)
```

## Slides

`loop-harness.pdf` — the talk deck, exported for reading offline.

## Talk arc (~40 min)

1. Single-shot LLM call, no loop. Show it producing plausible-but-wrong code once, with no way to
   know.
2. Level 1 (Ralph loop): same call, in a while loop with a gate. Run it live or rehearsed.
3. Level 2 (Ralph with memory): change `=` to `+=`. The maker now sees every prior attempt, not just
   the last. This one character is the paper's headline lever (full trace history 50.0 vs 34.6).
4. Level 3: add checker + reviewer. Same loop shape, one more judgment layer.
5. Level 4: no starting code. A test-writer turns a spec into a failing test; a separate maker writes
   code till it passes. Spec-driven TDD — and the test-author ≠ impl-author, so the gate stays honest.
6. Close: this is a real agent system's actual design, just with real git worktrees, concurrency, and a
   persisted store bolted on. The loop shape doesn't change.

## License

MIT — see [LICENSE](./LICENSE). Use it, fork it, teach with it.
