/**
 * MiniMax OpenAI-compatible chat client.
 * Default model: MiniMax-M2.7 (override with MINIMAX_MODEL).
 */

export type MinimaxChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type MinimaxChatOptions = {
  temperature?: number;
  maxTokens?: number;
  /** When true (default), thinking is separated so content is clean JSON/text. */
  reasoningSplit?: boolean;
  /** Abort the request after this many ms (default 14000). */
  timeoutMs?: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
      reasoning_details?: Array<{ text?: string }>;
    };
  }>;
  usage?: {
    completion_tokens?: number;
    prompt_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; type?: string };
  base_resp?: { status_code?: number; status_msg?: string };
};

export function getMinimaxApiKey(): string | null {
  const key = process.env.MINIMAX_API_KEY?.trim();
  return key || null;
}

export function getMinimaxModel(): string {
  return process.env.MINIMAX_MODEL?.trim() || "MiniMax-M2.7";
}

/** Base URL without trailing slash, e.g. https://api.minimax.io/v1 */
export function getMinimaxBaseUrl(): string {
  const raw =
    process.env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
  return raw.replace(/\/+$/, "");
}

/** Strip M2.x thinking tags if reasoning_split was not applied. */
export function stripMinimaxThinking(text: string): string {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<think>[\s\S]*?<\/redacted_reasoning>/gi, "")
    .trim();
}

/** Pull a JSON object out of mixed model output / reasoning text. */
export function extractJsonObject(text: string): string | null {
  const cleaned = stripMinimaxThinking(text);
  if (!cleaned) return null;
  const direct = cleaned.trim();
  if (direct.startsWith("{") && direct.endsWith("}")) return direct;
  const fenced = cleaned.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) return cleaned.slice(start, end + 1).trim();
  return null;
}

function pickMessageText(data: ChatCompletionResponse): string {
  const message = data.choices?.[0]?.message;
  if (!message) return "";

  const content = stripMinimaxThinking(String(message.content || ""));
  if (content) return content;

  // M2.x often burns the token budget on thinking; JSON may only appear there
  const reasoning = String(message.reasoning_content || "");
  const fromReasoning = extractJsonObject(reasoning);
  if (fromReasoning) return fromReasoning;

  const detailText = (message.reasoning_details || [])
    .map((d) => d.text || "")
    .join("\n");
  const fromDetails = extractJsonObject(detailText);
  if (fromDetails) return fromDetails;

  return "";
}

export async function minimaxChatCompletion(
  messages: MinimaxChatMessage[],
  options: MinimaxChatOptions = {}
): Promise<{ content: string; model: string } | null> {
  const apiKey = getMinimaxApiKey();
  if (!apiKey) return null;

  const model = getMinimaxModel();
  const baseUrl = getMinimaxBaseUrl();
  const temperature = options.temperature ?? 0.55;
  // M2.7 always thinks — budget must cover reasoning + final JSON
  const maxTokens = options.maxTokens ?? 4096;
  const reasoningSplit = options.reasoningSplit !== false;
  const timeoutMs = options.timeoutMs ?? 14000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        // Prefer max_completion_tokens for M2.x / OpenAI-compat
        max_completion_tokens: maxTokens,
        reasoning_split: reasoningSplit,
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`Minimax chat timed out after ${timeoutMs}ms`);
    } else {
      console.error("Minimax chat network error:", err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Minimax chat API error:", response.status, errorText);
    return null;
  }

  const data = (await response.json()) as ChatCompletionResponse;
  if (data.error?.message) {
    console.error("Minimax chat API error body:", data.error.message);
    return null;
  }
  if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
    console.error(
      "Minimax base_resp error:",
      data.base_resp.status_code,
      data.base_resp.status_msg
    );
    return null;
  }

  const content = pickMessageText(data);
  if (!content) {
    console.error("Minimax returned empty content", {
      finish_reason: data.choices?.[0]?.finish_reason,
      usage: data.usage,
      contentPreview: String(data.choices?.[0]?.message?.content || "").slice(
        0,
        120
      ),
      reasoningPreview: String(
        data.choices?.[0]?.message?.reasoning_content || ""
      ).slice(0, 120),
    });
    return null;
  }

  return { content, model: data.choices?.[0] ? model : model };
}
