import type { ConversationItem } from "@/types/inbox";

/** Un chat cuenta como "sin atender" cuando el cliente espera respuesta desde hace 5 minutos o más (el mismo umbral del cronómetro). */
export const UNATTENDED_AFTER_SECONDS = 5 * 60;

export interface UnattendedChat {
  id: string;
  senderName: string;
  waitingSeconds: number;
}

/** Chats esperando respuesta más allá del umbral, el más antiguo primero. */
export function findUnattendedChats(
  conversations: ConversationItem[],
  nowMs: number,
  thresholdSeconds: number = UNATTENDED_AFTER_SECONDS
): UnattendedChat[] {
  return conversations
    .filter((conversation) => conversation.waitingForReply && conversation.lastInboundTime)
    .map((conversation) => ({
      id: conversation.id,
      senderName: conversation.senderName,
      waitingSeconds: Math.max(0, Math.floor((nowMs - new Date(conversation.lastInboundTime as string).getTime()) / 1000)),
    }))
    .filter((chat) => chat.waitingSeconds >= thresholdSeconds)
    .sort((a, b) => b.waitingSeconds - a.waitingSeconds);
}

/** 125 s -> "2 min"; 4 h 12 min -> "4 h 12 min"; más de un día -> "2 d 3 h". */
export function formatWaitLabel(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}
