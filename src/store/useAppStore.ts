import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Tables, TablesInsert } from '../types/supabase';
import { Enums } from '../types/supabase';

type TicketStatus = Enums<'ticket_status'>;
type ChannelApiType = Enums<'channel_api_type'>;
type ChannelStatus = Enums<'channel_status'>;

interface AppState {
  // Auth
  session: Session | null;
  setSession: (session: Session | null) => void;

  // Core data
  contacts: Tables<'contacts'>[];
  messages: Tables<'messages'>[];
  tickets: Tables<'tickets'>[];
  agents: Tables<'profiles'>[];
  currentAgent: Tables<'profiles'> | null;
  channels: Tables<'channels'>[];
  quickReplies: Tables<'quick_replies'>[];
  
  // UI state
  loading: boolean;
  selectedTicket: Tables<'tickets'> | null;
  selectedContact: Tables<'contacts'> | null;
  activeTab: 'open' | 'pending' | 'resolved';
  sidebarOpen: boolean;
  darkMode: boolean;
  
  // Chat state
  isTyping: boolean;
  
  // Actions
  fetchInitialData: () => Promise<void>;
  setSelectedTicket: (ticket: Tables<'tickets'> | null) => void;
  setSelectedContact: (contact: Tables<'contacts'> | null) => void;
  setActiveTab: (tab: 'open' | 'pending' | 'resolved') => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  
  addMessage: (message: Omit<TablesInsert<'messages'>, 'id' | 'timestamp' | 'user_id'>) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  assignTicket: (ticketId: string, agentId: string) => Promise<void>;
  
  addContact: (contact: Omit<TablesInsert<'contacts'>, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  
  addChannel: (name: string, api: ChannelApiType) => Promise<void>;
  updateChannelStatus: (channelId: string, status: ChannelStatus, qrCode?: string) => Promise<void>;
  removeChannel: (channelId: string) => Promise<void>;

  addCampaign: (campaign: Omit<TablesInsert<'bulk_campaigns'>, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  saveChatbotFlow: (flow: Omit<TablesInsert<'chatbot_flows'>, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  session: null,
  contacts: [],
  messages: [],
  tickets: [],
  agents: [],
  currentAgent: null,
  channels: [],
  quickReplies: [],
  loading: true,
  selectedTicket: null,
  selectedContact: null,
  activeTab: 'open',
  sidebarOpen: true,
  darkMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
  isTyping: false,

  // Actions
  setSession: (session) => set({ session }),

  fetchInitialData: async () => {
    set({ loading: true });
    const [channelsRes, contactsRes, ticketsRes, profilesRes, messagesRes, quickRepliesRes] = await Promise.all([
      supabase.from('channels').select('*'),
      supabase.from('contacts').select('*'),
      supabase.from('tickets').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('messages').select('*'),
      supabase.from('quick_replies').select('*')
    ]);

    if (channelsRes.error || contactsRes.error || ticketsRes.error || profilesRes.error || messagesRes.error || quickRepliesRes.error) {
      console.error('Error fetching initial data:', { 
        channelsError: channelsRes.error, 
        contactsError: contactsRes.error, 
        ticketsError: ticketsRes.error, 
        profilesError: profilesRes.error, 
        messagesError: messagesRes.error,
        quickRepliesError: quickRepliesRes.error
      });
      set({ loading: false });
      return;
    }

    const user = get().session?.user;
    const currentAgent = profilesRes.data.find(p => p.id === user?.id) || null;

    set({
      channels: channelsRes.data || [],
      contacts: contactsRes.data || [],
      tickets: ticketsRes.data || [],
      agents: profilesRes.data || [],
      messages: messagesRes.data || [],
      quickReplies: quickRepliesRes.data || [],
      currentAgent,
      loading: false,
    });
  },

  setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),
  setSelectedContact: (contact) => set({ selectedContact: contact }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  
  addMessage: async (message) => {
    const user = get().session?.user;
    if (!user) return;
    const { data, error } = await supabase.from('messages').insert({ ...message, user_id: user.id }).select().single();
    if (error) console.error('Error adding message:', error);
    else set((state) => ({ messages: [...state.messages, data] }));
  },
  
  updateTicketStatus: async (ticketId, status) => {
    const { data, error } = await supabase.from('tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticketId).select().single();
    if (error) console.error('Error updating ticket status:', error);
    else set((state) => ({ tickets: state.tickets.map(t => t.id === ticketId ? data : t) }));
  },
  
  assignTicket: async (ticketId, agentId) => {
    const { data, error } = await supabase.from('tickets').update({ agent_id: agentId, updated_at: new Date().toISOString() }).eq('id', ticketId).select().single();
    if (error) console.error('Error assigning ticket:', error);
    else set((state) => ({ tickets: state.tickets.map(t => t.id === ticketId ? data : t) }));
  },
  
  addContact: async (contact) => {
    const user = get().session?.user;
    if (!user) return;
    const { data, error } = await supabase.from('contacts').insert({ ...contact, user_id: user.id }).select().single();
    if (error) console.error('Error adding contact:', error);
    else set((state) => ({ contacts: [...state.contacts, data] }));
  },

  addChannel: async (name, api) => {
    const user = get().session?.user;
    if (!user) return;
    const { data, error } = await supabase.from('channels').insert({ name, api, user_id: user.id, status: 'disconnected' }).select().single();
    if (error) console.error('Error adding channel:', error);
    else set((state) => ({ channels: [...state.channels, data] }));
  },

  updateChannelStatus: async (channelId, status, qrCode) => {
    const { data, error } = await supabase.from('channels').update({ status, qr_code: qrCode, last_sync: new Date().toISOString() }).eq('id', channelId).select().single();
    if (error) console.error('Error updating channel status:', error);
    else set((state) => ({ channels: state.channels.map(c => c.id === channelId ? data : c) }));
  },

  removeChannel: async (channelId) => {
    const { error } = await supabase.from('channels').delete().eq('id', channelId);
    if (error) console.error('Error removing channel:', error);
    else set((state) => ({ channels: state.channels.filter(c => c.id !== channelId) }));
  },

  addCampaign: async (campaign) => {
    const user = get().session?.user;
    if (!user) return;
    const { data, error } = await supabase.from('bulk_campaigns').insert({ ...campaign, user_id: user.id }).select().single();
    if (error) console.error('Error adding campaign:', error);
    // Optionally update state if you want to display campaigns in the UI
  },
  
  saveChatbotFlow: async (flow) => {
    const user = get().session?.user;
    if (!user) return;
    // Here we should check if a flow with this name exists and update it, or create a new one.
    // For simplicity, we'll just insert a new one.
    const { data, error } = await supabase.from('chatbot_flows').insert({ ...flow, user_id: user.id }).select().single();
    if (error) console.error('Error saving chatbot flow:', error);
  }
}));
