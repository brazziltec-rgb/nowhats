import { create } from 'zustand';
import { Tables, TablesInsert, TablesUpdate, Enums } from '../types/supabase';
import { channelsAPI, quickRepliesAPI } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

// Tipos do Supabase
type ChannelApiType = Enums<'channel_api_type'>;
type ChannelStatus = Enums<'channel_status'>;

// Interface para dados da API local (backend)
interface LocalChannel {
  id: string;
  name: string;
  api_type: string;
  status: string;
  qr_code?: string;
  last_sync?: string;
  created_at?: string;
}

interface LocalQuickReply {
  id: string;
  title: string;
  content: string;
  shortcut?: string;
  category?: string;
  created_at?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;

  // Core data
  contacts: Tables<'contacts'>[];
  messages: Tables<'messages'>[];
  tickets: Tables<'tickets'>[];
  agents: Tables<'profiles'>[];
  currentAgent: Tables<'profiles'> | null;
  channels: Tables<'channels'>[];
  quickReplies: Tables<'quick_replies'>[];
  campaigns: Tables<'bulk_campaigns'>[];
  
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
  
  addMessage: (message: Omit<TablesInsert<'messages'>, 'id' | 'created_at'>) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: string) => Promise<void>;
  assignTicket: (ticketId: string, agentId: string) => Promise<void>;
  
  addContact: (contact: Omit<TablesInsert<'contacts'>, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  
  addChannel: (name: string, api: ChannelApiType) => Promise<void>;
  addChannelWithConnection: (name: string, api: ChannelApiType) => Promise<{ channelId: string; success: boolean }>;
  updateChannelStatus: (channelId: string, status: ChannelStatus, qrCode?: string) => Promise<void>;
  removeChannel: (channelId: string) => Promise<void>;

  addCampaign: (campaign: Omit<TablesInsert<'bulk_campaigns'>, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  saveChatbotFlow: (flow: any) => Promise<void>;

  addQuickReply: (reply: Omit<TablesInsert<'quick_replies'>, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  updateQuickReply: (id: string, reply: Partial<TablesUpdate<'quick_replies'>>) => Promise<void>;
  deleteQuickReply: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  contacts: [],
  messages: [],
  tickets: [],
  agents: [],
  currentAgent: null,
  channels: [],
  quickReplies: [],
  campaigns: [],
  loading: true,
  selectedTicket: null,
  selectedContact: null,
  activeTab: 'open',
  sidebarOpen: true,
  darkMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
  isTyping: false,

  // Actions
  setUser: (user) => set({ user }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  fetchInitialData: async () => {
    set({ loading: true });
    try {
      // Buscar dados do backend local com tratamento de erro individual
      const channelsPromise = channelsAPI.getAll().catch(error => {
        console.warn('Failed to load channels from local API:', error);
        return { data: [] };
      });
      
      const quickRepliesPromise = quickRepliesAPI.getAll().catch(error => {
        console.warn('Failed to load quick replies from local API:', error);
        return { data: [] };
      });

      const [channelsRes, quickRepliesRes] = await Promise.all([
        channelsPromise,
        quickRepliesPromise
      ]);

      // Buscar dados do Supabase (se disponível) com tratamento de erro individual
      const supabasePromises = [
        supabase.from('contacts').select('*').then(res => ({ type: 'contacts' as const, ...res })),
        supabase.from('tickets').select('*').then(res => ({ type: 'tickets' as const, ...res })),
        supabase.from('profiles').select('*').then(res => ({ type: 'profiles' as const, ...res })),
        supabase.from('messages').select('*').then(res => ({ type: 'messages' as const, ...res })),
        supabase.from('bulk_campaigns').select('*').then(res => ({ type: 'campaigns' as const, ...res }))
      ];

      const supabaseResults = await Promise.allSettled(supabasePromises);
      
      // Processar resultados do Supabase
      const supabaseData: {
        contacts: Tables<'contacts'>[];
        tickets: Tables<'tickets'>[];
        profiles: Tables<'profiles'>[];
        messages: Tables<'messages'>[];
        campaigns: Tables<'bulk_campaigns'>[];
      } = {
        contacts: [],
        tickets: [],
        profiles: [],
        messages: [],
        campaigns: []
      };

      supabaseResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          const resultValue = result.value as { type: 'contacts' | 'tickets' | 'profiles' | 'messages' | 'campaigns'; data: any[]; error: any };
          const { type, data } = resultValue;
          if (type in supabaseData && data) {
            (supabaseData as any)[type] = data;
          }
        } else if (result.status === 'rejected') {
          console.warn(`Failed to load ${['contacts', 'tickets', 'profiles', 'messages', 'campaigns'][index]} from Supabase:`, result.reason);
        }
      });

      const currentUser = get().user;
      const currentAgent = supabaseData.profiles.find(p => p.id === currentUser?.id) || null;

      // Converter dados da API local para o formato esperado
      const convertedChannels: Tables<'channels'>[] = (channelsRes.data || []).map((channel: LocalChannel) => ({
        id: channel.id,
        name: channel.name,
        api: channel.api_type as ChannelApiType,
        status: channel.status as ChannelStatus,
        qr_code: channel.qr_code || null,
        last_sync: channel.last_sync || null,
        created_at: channel.created_at || null,
        instance_id: null,
        user_id: currentUser?.id || ''
      }));

      const convertedQuickReplies: Tables<'quick_replies'>[] = (quickRepliesRes.data || []).map((reply: LocalQuickReply) => ({
        id: reply.id,
        title: reply.title,
        content: reply.content,
        shortcut: reply.shortcut || null,
        category: reply.category || null,
        created_at: reply.created_at || null,
        user_id: currentUser?.id || ''
      }));

      set({
        channels: convertedChannels,
        contacts: supabaseData.contacts,
        tickets: supabaseData.tickets,
        agents: supabaseData.profiles,
        messages: supabaseData.messages,
        quickReplies: convertedQuickReplies,
        campaigns: supabaseData.campaigns,
        currentAgent,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching initial data:', error);
      set({ loading: false });
    }
  },

  setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),
  setSelectedContact: (contact) => set({ selectedContact: contact }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  
  addMessage: async (message: Omit<TablesInsert<'messages'>, 'id' | 'created_at'>) => {
    const user = get().user;
    if (!user) return;
    const { data, error } = await supabase.from('messages').insert({ ...message, user_id: user.id }).select().single();
    if (error) console.error('Error adding message:', error);
    else set((state) => ({ messages: [...state.messages, data] }));
  },
  
  updateTicketStatus: async (ticketId: string, status: string) => {
    const { data, error } = await supabase.from('tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticketId).select().single();
    if (error) console.error('Error updating ticket status:', error);
    else set((state) => ({ tickets: state.tickets.map(t => t.id === ticketId ? data : t) }));
  },
  
  assignTicket: async (ticketId: string, agentId: string) => {
    const { data, error } = await supabase.from('tickets').update({ agent_id: agentId, updated_at: new Date().toISOString() }).eq('id', ticketId).select().single();
    if (error) console.error('Error assigning ticket:', error);
    else set((state) => ({ tickets: state.tickets.map(t => t.id === ticketId ? data : t) }));
  },
  
  addContact: async (contact: Omit<TablesInsert<'contacts'>, 'id' | 'created_at' | 'user_id'>) => {
    const user = get().user;
    if (!user) return;
    const { data, error } = await supabase.from('contacts').insert({ ...contact, user_id: user.id }).select().single();
    if (error) console.error('Error adding contact:', error);
    else set((state) => ({ contacts: [...state.contacts, data] }));
  },

  addChannel: async (name: string, api: ChannelApiType) => {
    try {
      const response = await channelsAPI.create({ name, api_type: api });
      const localChannel = response.data;
      
      // Converter para o formato esperado pelo estado
      const currentUser = get().user;
      const newChannel: Tables<'channels'> = {
        id: localChannel.id,
        name: localChannel.name,
        api: (localChannel.api_type || localChannel.api) as ChannelApiType,
          status: (localChannel.status as ChannelStatus) || 'disconnected',
        qr_code: localChannel.qr_code || null,
        last_sync: localChannel.last_sync || null,
        created_at: localChannel.created_at || null,
        instance_id: null,
        user_id: currentUser?.id || ''
      };
      
      set((state) => ({ channels: [...state.channels, newChannel] }));
    } catch (error) {
      console.error('Error adding channel:', error);
      throw error; // Re-throw para permitir tratamento no componente
    }
  },

  addChannelWithConnection: async (name: string, api: ChannelApiType) => {
    try {
      const response = await channelsAPI.createAndConnect({ name, api });
      const responseData = response.data;
      
      // Verificar se a resposta tem a estrutura esperada
      if (responseData && (responseData.success !== false)) {
        // Pode ser que a resposta seja direta ou tenha uma estrutura aninhada
        const channelData = responseData.data?.channel || responseData.channel || responseData;
        
        // Converter para o formato esperado pelo estado
        const currentUser = get().user;
        const newChannel: Tables<'channels'> = {
          id: channelData.id,
          name: channelData.name || name,
          api: (channelData.api || channelData.api_type || api) as ChannelApiType,
          status: (channelData.status as ChannelStatus) || 'connecting',
          qr_code: channelData.qr_code || null,
          last_sync: channelData.last_sync || null,
          created_at: channelData.created_at || null,
          instance_id: channelData.instance_id || null,
          user_id: currentUser?.id || ''
        };
        
        set((state) => ({ channels: [...state.channels, newChannel] }));
        
        return { channelId: channelData.id, success: true };
      } else {
        throw new Error(responseData?.message || 'Erro ao criar canal');
      }
    } catch (error) {
      console.error('Error adding channel with connection:', error);
      throw error;
    }
  },

  updateChannelStatus: async (channelId: string, status: ChannelStatus, qrCode?: string) => {
    // Update local state immediately for better UX
    set((state) => ({
      channels: state.channels.map(c => 
        c.id === channelId 
          ? { ...c, status, qr_code: qrCode || c.qr_code, last_sync: new Date().toISOString() }
          : c
      )
    }));
  },

  removeChannel: async (channelId: string) => {
    try {
      await channelsAPI.delete(channelId);
      set((state) => ({ channels: state.channels.filter(c => c.id !== channelId) }));
    } catch (error) {
      console.error('Error removing channel:', error);
      throw error; // Re-throw para permitir tratamento no componente
    }
  },

  addCampaign: async (campaign: Omit<TablesInsert<'bulk_campaigns'>, 'id' | 'created_at' | 'user_id'>) => {
    try {
      const user = get().user;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('bulk_campaigns')
        .insert({ ...campaign, user_id: user.id })
        .select()
        .single();
        
      if (error) {
        console.error('Error adding campaign:', error);
        throw error;
      }
      
      if (data) {
        set((state) => ({ campaigns: [...state.campaigns, data] }));
      }
    } catch (error) {
      console.error('Error adding campaign:', error);
      throw error; // Re-throw para permitir tratamento no componente
    }
  },
  
  saveChatbotFlow: async (flow: any) => {
    try {
      const user = get().user;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from('chatbot_flows')
        .insert({ ...flow, user_id: user.id })
        .select()
        .single();
        
      if (error) {
        console.error('Error saving chatbot flow:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error saving chatbot flow:', error);
      throw error; // Re-throw para permitir tratamento no componente
    }
  },

  addQuickReply: async (reply: Omit<TablesInsert<'quick_replies'>, 'id' | 'created_at' | 'user_id'>) => {
    try {
      const response = await quickRepliesAPI.create(reply);
      const localReply = response.data as LocalQuickReply;
      
      // Converter para o formato esperado pelo estado
      const currentUser = get().user;
      const newQuickReply: Tables<'quick_replies'> = {
        id: localReply.id,
        title: localReply.title,
        content: localReply.content,
        shortcut: localReply.shortcut || null,
        category: localReply.category || null,
        created_at: localReply.created_at || new Date().toISOString(),
        user_id: currentUser?.id || ''
      };
      
      set((state) => ({ quickReplies: [...state.quickReplies, newQuickReply] }));
    } catch (error) {
      console.error('Error adding quick reply:', error);
      throw error; // Re-throw para permitir tratamento no componente
    }
  },

  updateQuickReply: async (id: string, reply: Partial<TablesUpdate<'quick_replies'>>) => {
    try {
      const response = await quickRepliesAPI.update(id, reply);
      const localReply = response.data as LocalQuickReply;
      
      // Converter para o formato esperado pelo estado
      const currentUser = get().user;
      const updatedQuickReply: Tables<'quick_replies'> = {
        id: localReply.id,
        title: localReply.title,
        content: localReply.content,
        shortcut: localReply.shortcut || null,
        category: localReply.category || null,
        created_at: localReply.created_at || new Date().toISOString(),
        user_id: currentUser?.id || ''
      };
      
      set((state) => ({ quickReplies: state.quickReplies.map(r => r.id === id ? updatedQuickReply : r) }));
    } catch (error) {
      console.error('Error updating quick reply:', error);
      throw error; // Re-throw para permitir tratamento no componente
    }
  },

  deleteQuickReply: async (id: string) => {
    try {
      await quickRepliesAPI.delete(id);
      set((state) => ({ quickReplies: state.quickReplies.filter(r => r.id !== id) }));
    } catch (error) {
      console.error('Error deleting quick reply:', error);
      throw error; // Re-throw para permitir tratamento no componente
    }
  }
}));
