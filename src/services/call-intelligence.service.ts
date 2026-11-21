import { prisma } from "@/lib/prisma";
import { getAiConfig, createChatCompletion, transcribeAudio } from "@/lib/integrations/openai";
import { getTwilioConfig } from "@/lib/integrations/twilio";
import { ensureTwilioRuntimeConfig } from "@/services/integrations.service";
import { ACTIVITY_TYPE } from "@/lib/constants/crm";

export interface CallAnalysisResult {
  success: boolean;
  error?: string;
  transcription?: string;
  summary?: string;
  keyTakeaways?: string;
  actionItems?: string;
  sentiment?: "positive" | "neutral" | "negative";
}

interface ParsedAnalysis {
  summary: string;
  keyTakeaways: string;
  actionItems: string;
  sentiment: "positive" | "neutral" | "negative";
}

function parseAnalysisJson(rawJson: string): ParsedAnalysis {
  try {
    // Limpiar markdown fences si el modelo las incluye (```json ... ```)
    const cleaned = rawJson
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const validSentiments = ["positive", "neutral", "negative"];
    const sentiment = validSentiments.includes(parsed.sentiment) ? parsed.sentiment : "neutral";

    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "Resumen no disponible.",
      keyTakeaways: typeof parsed.keyTakeaways === "string" ? parsed.keyTakeaways.trim() : "No se registraron puntos clave.",
      actionItems: typeof parsed.actionItems === "string" ? parsed.actionItems.trim() : "No se detectaron compromisos pendientes.",
      sentiment,
    };
  } catch {
    return {
      summary: rawJson.slice(0, 300),
      keyTakeaways: "Puntos clave extraídos automáticamente.",
      actionItems: "Pendiente de seguimiento por el asesor.",
      sentiment: "neutral",
    };
  }
}

/**
 * Descarga la grabación de Twilio, la transcribe con Whisper y genera una minuta
 * comercial ejecutiva estructurada con IA (resumen, puntos clave, objeciones/compromisos y sentimiento).
 */
export async function analyzeCall(callId: string): Promise<CallAnalysisResult> {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      lead: { select: { id: true, name: true, clientId: true } },
      user: { select: { id: true, name: true } },
      line: { select: { label: true } },
    },
  });

  if (!call) {
    return { success: false, error: "Llamada no encontrada." };
  }

  if (!call.recordingSid) {
    return { success: false, error: "La llamada no cuenta con grabación de audio disponible." };
  }

  await ensureTwilioRuntimeConfig();
  const cfg = getTwilioConfig();
  if (!cfg) {
    return { success: false, error: "Twilio no está configurado en el sistema." };
  }

  // 1. Descargar audio de Twilio
  let audioBuffer: Buffer;
  try {
    const authHeader = "Basic " + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
    const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Recordings/${call.recordingSid}.mp3`;

    const twilioRes = await fetch(recordingUrl, {
      method: "GET",
      headers: { Authorization: authHeader },
      redirect: "follow",
    });

    if (!twilioRes.ok) {
      return { success: false, error: `No se pudo descargar la grabación de Twilio (Status ${twilioRes.status}).` };
    }

    const arrayBuffer = await twilioRes.arrayBuffer();
    audioBuffer = Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error al descargar grabación de llamada ${callId}:`, error);
    return { success: false, error: "Fallo de conexión al descargar el archivo de audio de Twilio." };
  }

  // 2. Transcribir con OpenAI Whisper
  const transcriptionResult = await transcribeAudio(audioBuffer, `call_${callId}.mp3`);
  if (transcriptionResult.error || !transcriptionResult.text) {
    console.warn(`Aviso de transcripción para llamada ${callId}: ${transcriptionResult.error}`);
  }

  const transcriptionText = transcriptionResult.text || "";

  // 3. Generar análisis con Chat Completions
  const { apiKey, model } = getAiConfig();
  let analysis: ParsedAnalysis = {
    summary: "Llamada procesada sin transcripción de voz disponible.",
    keyTakeaways: "Audio breve o sin conversación comprensible.",
    actionItems: "Verificar registro de llamada con el cliente.",
    sentiment: "neutral",
  };

  if (apiKey && transcriptionText.length > 15) {
    const leadContext = call.lead ? `Prospecto/Cliente: ${call.lead.name}` : `Número: ${call.toNumber}`;
    const advisorContext = call.user ? `Asesor: ${call.user.name}` : "Asesor Comercial";

    const promptMessages = [
      {
        role: "system" as const,
        content: `Eres un director comercial y auditor de calidad experto en llamadas de ventas inmobiliarias, automotrices y B2B.
Analiza la siguiente llamada telefónica entre un asesor y un prospecto.
Debes devolver OBLIGATORIAMENTE un JSON estricto (sin explicaciones adicionales fuera del JSON) con esta estructura:
{
  "summary": "Resumen ejecutivo claro y conciso de 2 a 3 oraciones con el motivo de la llamada y el acuerdo alcanzado.",
  "keyTakeaways": "Puntos clave tratados, dudas manifestadas u objeciones (formato de lista con guiones)",
  "actionItems": "Próximos pasos concretos, tareas y compromisos (ej. enviar cotización, agendar visita)",
  "sentiment": "positive" | "neutral" | "negative"
}`,
      },
      {
        role: "user" as const,
        content: `Contexto: ${advisorContext} en conversación con ${leadContext}.
Duración de la llamada: ${call.durationSec ? `${call.durationSec} segundos` : "No especificada"}.

Transcripción completa de la llamada:
"""
${transcriptionText}
"""`,
      },
    ];

    const completion = await createChatCompletion({
      apiKey,
      model,
      messages: promptMessages,
      maxOutputTokens: 600,
      timeoutMs: 30000,
    });

    if (completion.text) {
      analysis = parseAnalysisJson(completion.text);
    }
  }

  // 4. Actualizar la llamada en la base de datos
  await prisma.call.update({
    where: { id: callId },
    data: {
      transcriptionText: transcriptionText || null,
      aiSummary: analysis.summary,
      aiKeyTakeaways: analysis.keyTakeaways,
      aiActionItems: analysis.actionItems,
      aiSentiment: analysis.sentiment,
    },
  });

  // 5. Registrar Activity en el historial del lead si está asociado
  if (call.leadId) {
    const sentimentEmoji = analysis.sentiment === "positive" ? "🟢 Positiva" : analysis.sentiment === "negative" ? "🔴 Negativa" : "🟡 Neutral";

    await prisma.activity.create({
      data: {
        leadId: call.leadId,
        clientId: call.lead?.clientId || call.clientId,
        userId: call.userId,
        type: ACTIVITY_TYPE.CALL,
        title: `Minuta IA · Llamada (${sentimentEmoji})`,
        description: `📋 Resumen:\n${analysis.summary}\n\n💡 Puntos Clave:\n${analysis.keyTakeaways}\n\n✅ Próximos Pasos:\n${analysis.actionItems}`,
        outcome: "completed",
      },
    });

    // Actualizar el resumen del lead para visibilidad en el CRM
    await prisma.lead
      .update({
        where: { id: call.leadId },
        data: {
          aiSummary: analysis.summary,
        },
      })
      .catch(() => {});
  }

  return {
    success: true,
    transcription: transcriptionText,
    summary: analysis.summary,
    keyTakeaways: analysis.keyTakeaways,
    actionItems: analysis.actionItems,
    sentiment: analysis.sentiment,
  };
}
