export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bulk_campaigns: {
        Row: {
          channel_ids: string[] | null
          created_at: string | null
          id: string
          media_name: string | null
          media_url: string | null
          message_text: string | null
          name: string
          progress: number | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          targets: string[] | null
          user_id: string
        }
        Insert: {
          channel_ids?: string[] | null
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_url?: string | null
          message_text?: string | null
          name: string
          progress?: number | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          targets?: string[] | null
          user_id: string
        }
        Update: {
          channel_ids?: string[] | null
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_url?: string | null
          message_text?: string | null
          name?: string
          progress?: number | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          targets?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          api: Database["public"]["Enums"]["channel_api_type"]
          created_at: string | null
          id: string
          instance_id: string | null
          last_sync: string | null
          name: string
          qr_code: string | null
          status: Database["public"]["Enums"]["channel_status"] | null
          user_id: string
        }
        Insert: {
          api: Database["public"]["Enums"]["channel_api_type"]
          created_at?: string | null
          id?: string
          instance_id?: string | null
          last_sync?: string | null
          name: string
          qr_code?: string | null
          status?: Database["public"]["Enums"]["channel_status"] | null
          user_id: string
        }
        Update: {
          api?: Database["public"]["Enums"]["channel_api_type"]
          created_at?: string | null
          id?: string
          instance_id?: string | null
          last_sync?: string | null
          name?: string
          qr_code?: string | null
          status?: Database["public"]["Enums"]["channel_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_flows: {
        Row: {
          created_at: string | null
          edges: Json | null
          id: string
          is_active: boolean | null
          name: string
          nodes: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          edges?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          nodes?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          edges?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          nodes?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_flows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar: string | null
          created_at: string | null
          id: string
          is_group: boolean | null
          last_seen: string | null
          name: string
          phone: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          id?: string
          is_group?: boolean | null
          last_seen?: string | null
          name: string
          phone: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          id?: string
          is_group?: boolean | null
          last_seen?: string | null
          name?: string
          phone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_from_contact: boolean
          reply_to: string | null
          status: Database["public"]["Enums"]["message_status"] | null
          ticket_id: string
          timestamp: string | null
          type: Database["public"]["Enums"]["message_type"]
          user_id: string
        }
        Insert: {
          content?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_from_contact: boolean
          reply_to?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          ticket_id: string
          timestamp?: string | null
          type: Database["public"]["Enums"]["message_type"]
          user_id: string
        }
        Update: {
          content?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_from_contact?: boolean
          reply_to?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          ticket_id?: string
          timestamp?: string | null
          type?: Database["public"]["Enums"]["message_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          id: string
          name: string | null
          role: Database["public"]["Enums"]["agent_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["agent_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["agent_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          shortcut: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          shortcut?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          shortcut?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          agent_id: string | null
          contact_id: string
          created_at: string | null
          department: string | null
          id: string
          notes: string[] | null
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          protocol: string | null
          rating: number | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          contact_id: string
          created_at?: string | null
          department?: string | null
          id?: string
          notes?: string[] | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          protocol?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          contact_id?: string
          created_at?: string | null
          department?: string | null
          id?: string
          notes?: string[] | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          protocol?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      agent_role: "agent" | "supervisor" | "admin"
      campaign_status: "draft" | "scheduled" | "sending" | "completed" | "failed"
      channel_api_type: "baileys" | "evolution" | "web-js"
      channel_status: "connected" | "disconnected" | "connecting" | "error"
      message_status: "sent" | "delivered" | "read"
      message_type: "text" | "image" | "audio" | "video" | "document" | "contact"
      ticket_priority: "low" | "medium" | "high"
      ticket_status: "open" | "pending" | "resolved" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
