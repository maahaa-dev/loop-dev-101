export type LLMConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
};

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Calls any provider that speaks the OpenAI `/chat/completions` shape —
 * OpenAI, Groq, DeepSeek, Together, OpenRouter, a local Ollama server — by
 * swapping `baseURL`/`apiKey`/`model` in `cfg`. Anthropic and Google use a
 * different request/response shape and need a real adapter, not this shim.
 *
 * Pass `model` to override `cfg.model` for this one call — that's how level 3
 * routes a cheap checker and a thinking reviewer to different models than the
 * maker, over the same endpoint and key.
 */
export async function callLLM(
  cfg: LLMConfig,
  messages: Message[],
  model: string = cfg.model
): Promise<string> {
  // Opt-in: set LLM_NO_THINK=1 to ask a thinking model (e.g. qwen3.x on Ollama)
  // to skip its reasoning pass — faster, and the answer lands in `content`.
  // Other providers ignore the unknown field, so it's safe to always allow.
  const body: Record<string, unknown> = { model, messages };
  if (process.env.LLM_NO_THINK) body.think = false;

  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`LLM call failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  // Thinking models (e.g. qwen3.x via Ollama) put their answer in
  // `message.reasoning` and leave `message.content` empty — fall back to it so
  // the loop gets *something* to parse instead of an empty string. Non-thinking
  // providers have no `reasoning` field, so this is a no-op for them.
  const msg = data.choices?.[0]?.message ?? {};
  const content = (msg.content?.trim() || msg.reasoning?.trim()) ?? "";
  if (!content) {
    throw new Error(`LLM response had no content: ${JSON.stringify(data)}`);
  }
  return content;
}
