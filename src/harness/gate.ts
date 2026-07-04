import { execSync } from "node:child_process";

export type GateResult = {
  pass: boolean;
  output: string;
};

/**
 * Runs the given shell command and reports pass/fail from its exit code —
 * the one authority the loop trusts over any model's opinion of its own
 * work. Falls back to the exec error's own message when the command never
 * produced stdout/stderr (e.g. the binary itself is missing), so a broken
 * gate command surfaces a real reason instead of empty feedback.
 */
export function runGate(command: string): GateResult {
  try {
    const output = execSync(command, { encoding: "utf8", stdio: "pipe" });
    return { pass: true, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const combined = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    return { pass: false, output: combined || e.message || "" };
  }
}
