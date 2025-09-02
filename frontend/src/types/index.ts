import { Database } from './supabase';

// Tipos baseados no Supabase
export type ChannelApiType = Database['public']['Enums']['channel_api_type'];
export type ChannelStatus = Database['public']['Enums']['channel_status'];
export type Channel = Database['public']['Tables']['channels']['Row'];
export type ChannelInsert = Database['public']['Tables']['channels']['Insert'];
export type ChannelUpdate = Database['public']['Tables']['channels']['Update'];

// Tipos para formulários
export interface NewChannelForm {
  name: string;
  api: ChannelApiType;
}

// Tipos para API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface QRCodeResponse {
  qrCode: string;
  status: ChannelStatus;
}

export interface ChannelConnectionResponse {
  id: string;
  name: string;
  api: ChannelApiType;
  status: ChannelStatus;
  qr_code?: string;
}