/**
 * Cliente mínimo de OpenAI Chat Completions (REST con fetch, sin SDK).
 * Docs: https://platform.openai.com/docs/api-reference/chat/create
 */

import { DEFAULT_AI_MODEL, OPENAI_CHAT_COMPLETIONS_URL } from "@/lib/constants/ai-assistant";
import type { ChatMessage } from "@/lib/ai-assistant/prompt";

export function getAiConfig() {
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL;
  return { apiKey: apiKey || null, model };
}

export interface ChatCompletionInput {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  maxOutputTokens: number;
  timeoutMs: number;
}

/** Solo uno de los dos viene definido. */
export interface ChatCompletionResult {
  text: string | null;
  error: string | null;
}

const failure = (error: string): ChatCompletionResult => ({ text: null, error });

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
  error?: { message?: string };
}

/** Pide una respuesta al modelo. Nunca lanza: un error o timeout vuelve en `error`. */
export async function createChatCompletion(input: ChatCompletionInput): Promise<ChatCompletionResult> {
  try {
    const res = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
      // Sin `temperature`: los modelos de razonamiento la rechazan y AI_MODEL es configurable.
      // `max_completion_tokens` reemplaza a `max_tokens` (obsoleto) y lo aceptan todos.
      body: JSON.stringify({ model: input.model, messages: input.messages, max_completion_tokens: input.maxOutputTokens }),
      signal: AbortSignal.timeout(input.timeoutMs),
    });
    const data: ChatCompletionResponse = await res.json().catch(() => ({}));
    if (!res.ok) return failure(`OpenAI respondió ${res.status}: ${data.error?.message ?? "sin detalle"}`);

    const message = data.choices?.[0]?.message;
    if (message?.refusal) return failure("El modelo se negó a responder.");
    const text = message?.content?.trim();
    return text ? { text, error: null } : failure("El modelo devolvió una respuesta vacía.");
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    if (timedOut) return failure(`OpenAI no respondió en ${input.timeoutMs} ms.`);
    return failure(error instanceof Error ? error.message : "Fallo de conexión con OpenAI");
  }
}

/**
 * Transcribe un archivo de audio (MP3, WAV, etc.) a texto en español utilizando Whisper de OpenAI.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename = "call.mp3"
): Promise<{ text: string | null; error: string | null }> {
  const { apiKey } = getAiConfig();
  if (!apiKey) {
    return { text: null, error: "AI_API_KEY no está configurada en las variables de entorno." };
  }

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" });
    formData.append("file", blob, filename);
    formData.append("model", "whisper-1");
    formData.append("language", "es");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: AbortSignal.timeout(60000), // 60 segundos timeout para audio
    });

    const data = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
    if (!res.ok) {
      return { text: null, error: `Whisper respondió ${res.status}: ${data.error?.message ?? "Error en transcripción"}` };
    }

    return { text: data.text?.trim() ?? "", error: null };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    if (timedOut) return { text: null, error: "OpenAI Whisper excedió el tiempo límite de 60 segundos." };
    return { text: null, error: error instanceof Error ? error.message : "Error inesperado al transcribir audio" };
  }
}
