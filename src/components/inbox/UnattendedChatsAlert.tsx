"use client";

import { X } from "lucide-react";
import { formatWaitLabel, type UnattendedChat } from "@/lib/unattended-chats";
import { CartoonAlarmClock } from "./CartoonAlarmClock";

interface UnattendedChatsAlertProps {
  chats: UnattendedChat[];
  onOpenOldest: () => void;
  onSilence: () => void;
}

/** Aviso abajo a la derecha cuando hay chats esperando respuesta: reloj de caricatura, cuántos son y cuánto lleva el más antiguo. */
export function UnattendedChatsAlert({ chats, onOpenOldest, onSilence }: UnattendedChatsAlertProps) {
  if (chats.length === 0) return null;
  const oldest = chats[0];

  return (
    <div
      role="alert"
      className="fixed bottom-5 right-5 z-40 w-[300px] max-w-[calc(100vw-2.5rem)] flex items-center gap-3 pl-2 pr-3 py-3 rounded-[24px] bg-white dark:bg-[#121417] border border-rose-200 dark:border-rose-900/60 shadow-2xl"
    >
      <div className="shrink-0 -my-2">
        <CartoonAlarmClock size={68} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-[#121417] dark:text-white leading-tight">
          {chats.length === 1 ? "1 chat sin atender" : `${chats.length} chats sin atender`}
        </p>
        <p className="text-[11px] text-[#667085] dark:text-[#8C929D] truncate">
          {oldest.senderName} lleva {formatWaitLabel(oldest.waitingSeconds)}
        </p>
        <button
          type="button"
          onClick={onOpenOldest}
          className="mt-1.5 px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
        >
          Atender
        </button>
      </div>

      <button
        type="button"
        onClick={onSilence}
        title="Silenciar el aviso 10 minutos"
        className="self-start p-1 rounded-full text-[#8C929D] hover:text-[#121417] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
