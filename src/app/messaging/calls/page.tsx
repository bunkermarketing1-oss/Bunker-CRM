"use client";

import React from "react";
import PageHeader from "@/components/ui/PageHeader";
import { PhonePanel } from "@/components/calls/PhonePanel";
import { CallHistoryList } from "@/components/calls/CallHistoryList";
import { LiveCallsPanel } from "@/components/calls/LiveCallsPanel";
import { PhoneLinesPanel } from "@/components/calls/PhoneLinesPanel";
import { useAuth } from "@/context/AuthContext";
import { useCalls } from "@/hooks/useCalls";
import { useCallableLeads } from "@/hooks/useCallableLeads";
import { useClientOptions } from "@/hooks/useClientOptions";
import { usePhoneLines } from "@/hooks/usePhoneLines";
import { useVoiceDevice } from "@/hooks/useVoiceDevice";

export default function CallsPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(user && !user.isClientUser);
  const { calls, liveCalls, loading, refresh } = useCalls();
  const leads = useCallableLeads();
  const clients = useClientOptions();
  const phoneLines = usePhoneLines(isAdmin);
  const voice = useVoiceDevice({ onCallEnded: refresh });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        section="Mensajería"
        title="Llamadas"
        description="Llama a tus leads desde el navegador; cada llamada queda registrada en el lead."
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PhonePanel
            phase={voice.phase}
            error={voice.error}
            active={voice.active}
            incoming={voice.incoming}
            leads={leads}
            onCall={voice.callLead}
            onHangup={voice.hangup}
            onToggleMute={voice.toggleMute}
            onAccept={voice.acceptIncoming}
            onReject={voice.rejectIncoming}
          />
          {isAdmin && <LiveCallsPanel calls={liveCalls} canJoin={voice.phase === "ready"} onMonitor={voice.monitor} />}
          {isAdmin && (
            <PhoneLinesPanel lines={phoneLines.lines} clients={clients} onCreate={phoneLines.create} onUpdate={phoneLines.update} />
          )}
        </div>
        <div className="lg:col-span-3">
          <CallHistoryList calls={calls} loading={loading} />
        </div>
      </div>
    </div>
  );
}
