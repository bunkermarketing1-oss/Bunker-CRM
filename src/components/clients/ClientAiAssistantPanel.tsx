"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import { useClientAiAssistant } from "@/hooks/useClientAiAssistant";
import { AiAssistantForm } from "@/components/clients/AiAssistantForm";

/** Pestaña "Asistente IA" de la ficha del cliente (solo admin). */
export function ClientAiAssistantPanel({ clientId }: { clientId: string }) {
  const { settings, aiConfigured, model, loading, error, save } = useClientAiAssistant(clientId);

  return (
    <section className="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold text-sm text-[#1F1E1D] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D97757]" />
          Asistente de IA fuera de horario
        </h3>
        <p className="text-[11px] text-[#716F6A]">
          Contesta por SMS a los leads de este cliente cuando escriben fuera del horario de atención, solo con la
          información de la base de conocimiento. Las respuestas quedan marcadas como &quot;IA&quot; en el historial de SMS.
          A OpenAI solo se envían el primer nombre del lead, los textos de la conversación y esta configuración.
        </p>
      </div>

      {settings && !aiConfigured && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Falta AI_API_KEY en el servidor: mientras no se configure, fuera de horario solo se envía el mensaje de traspaso.
        </div>
      )}

      {loading && !settings && <div className="h-48 rounded-xl bg-[#FAF9F5] animate-pulse" />}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

      {/* La key reinicia el formulario con lo que devolvió el servidor al guardar. */}
      {settings && <AiAssistantForm key={settings.updatedAt ?? "new"} settings={settings} onSave={save} />}
      {settings && aiConfigured && <p className="text-[10px] text-[#82807C]">Modelo: {model}</p>}
    </section>
  );
}
