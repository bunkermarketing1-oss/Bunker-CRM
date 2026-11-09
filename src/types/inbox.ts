export type InboxChannel =
  | "all"
  | "whatsapp"
  | "messenger"
  | "instagram"
  | "sms"
  | "comments"
  | "facebook_comment"
  | "instagram_comment";

export interface ConversationMessage {
  id: string;
  senderName: string;
  body: string;
  createdAt: string;
  direction: "inbound" | "outbound";
  status?: string;
  channel?: string;
}

export interface ConversationItem {
  id: string;
  channel: "whatsapp" | "messenger" | "instagram" | "sms" | "facebook_comment" | "instagram_comment";
  senderName: string;
  senderAvatar?: string | null;
  recipient: string;
  clientId: string | null;
  clientName: string | null;
  connectedAccountId: string | null;
  accountName: string | null;
  unreadCount: number;
  lastMessageText: string;
  lastMessageTime: string;
  waitingForReply?: boolean;
  lastInboundTime?: string | null;
  postContext?: {
    postId: string;
    postTitle: string;
    commentId: string;
  } | null;
  messages: ConversationMessage[];
  leadId?: string | null;
  leadPhone?: string | null;
  leadEmail?: string | null;
  assignedAdvisorId?: string | null;
  assignedAdvisorName?: string | null;
}

export interface AdvisorOption {
  id: string;
  name: string;
  email: string;
  role: string;
  clientId?: string | null;
}

export interface InboxStats {
  total: number;
  unread: number;
  whatsapp: number;
  messenger: number;
  instagram: number;
  sms: number;
  comments: number;
}

export interface InboxResponse {
  success: boolean;
  targetClientId?: string | null;
  conversations: ConversationItem[];
  stats: InboxStats;
  connectedAccounts?: Array<{
    id: string;
    accountName: string;
    accountType: string | null;
    externalId: string | null;
    clientId: string | null;
    client: { id: string; name: string } | null;
  }>;
  clients?: Array<{ id: string; name: string; companyName?: string | null }>;
  advisors?: AdvisorOption[];
  error?: string;
}
