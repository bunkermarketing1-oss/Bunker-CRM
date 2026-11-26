import type { ConversationItem, ConversationMessage } from "@/types/inbox";

const COMMENTS_TAB = "comments";
const ALL_TAB = "all";

/** Una conversación pertenece a una pestaña si coincide su canal; "comments" agrupa los dos tipos de comentario. */
export function conversationMatchesChannel(channel: ConversationItem["channel"], tab: string): boolean {
  if (tab === ALL_TAB) return true;
  if (tab === COMMENTS_TAB) return channel === "facebook_comment" || channel === "instagram_comment";
  return channel === tab;
}

function mergeMessages(existing: ConversationMessage[], incoming: ConversationMessage[]): ConversationMessage[] {
  const byId = new Map<string, ConversationMessage>();
  for (const message of existing) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * Une el lote recién recibido con lo que ya está en pantalla.
 * - Las conversaciones que ya tenías y no vinieron en este lote se conservan (cambiar de pestaña no las borra).
 * - Si una ya existía, el historial largo que cargaste al abrirla no se pierde: la lista solo trae los mensajes recientes.
 * - El resultado queda ordenado con la más reciente arriba.
 */
export function mergeConversations(previous: ConversationItem[], incoming: ConversationItem[]): ConversationItem[] {
  const byId = new Map<string, ConversationItem>();
  for (const conversation of previous) byId.set(conversation.id, conversation);

  for (const conversation of incoming) {
    const existing = byId.get(conversation.id);
    byId.set(
      conversation.id,
      existing ? { ...conversation, messages: mergeMessages(existing.messages, conversation.messages) } : conversation
    );
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );
}
