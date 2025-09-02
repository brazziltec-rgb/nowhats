export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  lastSeen: Date;
  isGroup: boolean;
  groupMembers?: string[];
}

export interface Message {
  id: string;
  contactId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'contact';
  timestamp: Date;
  isFromContact: boolean;
  status: 'sent' | 'delivered' | 'read';
  fileUrl?: string;
  fileName?: string;
  replyTo?: string;
}

export interface Ticket {
  id: string;
  contactId: string;
  agentId?: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  department: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: Message;
  rating?: number;
  notes: string[];
  protocol: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  department: string;
  role: 'agent' | 'supervisor' | 'admin';
}

export type ChannelStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
export type ApiType = 'baileys' | 'evolution' | 'web-js';

export interface Channel {
  id: string;
  name: string;
  api: ApiType;
  status: ChannelStatus;
  qrCode?: string;
  instanceId?: string;
  lastSync: Date;
}

export interface BulkCampaign {
  id: string;
  name: string;
  channelId: string;
  message: {
    text: string;
    media?: {
      type: 'image' | 'video' | 'document';
      url: string;
      name: string;
    }
  };
  targets: string[]; // contact IDs or numbers
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
}

export interface Chatbot {
  id: string;
  name: string;
  isActive: boolean;
  triggers: string[];
  flows: ChatbotFlow[];
}

export interface ChatbotFlow {
  id: string;
  nodes: ChatbotNode[];
  edges: ChatbotEdge[];
}

export interface ChatbotNode {
  id: string;
  type: 'messageNode' | 'conditionNode' | 'actionNode' | 'inputNode' | 'buttonsNode';
  position: { x: number; y: number };
  data: any;
}

export interface ChatbotEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  type?: string;
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut: string;
}

export interface Analytics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  averageResponseTime: number; // in minutes
  satisfactionRate: number; // 1-5 scale
  agentPerformance: AgentPerformance[];
  ticketsByHour: { hour: number; count: number }[];
  ticketsByDay: { date: string; count: number }[];
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  ticketsResolved: number;
  averageResponseTime: number; // in minutes
  satisfactionRate: number; // 1-5 scale
}
