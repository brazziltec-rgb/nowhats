/*
          # Initial Schema Setup
          This script sets up the initial database schema for the WhatsApp support system, including tables for users, channels, contacts, tickets, and messages. It also establishes relationships and enables Row Level Security (RLS) with basic policies.

          ## Query Description: 
          This is a foundational script. It creates the core tables for the application to function. It does not contain any data and is safe to run on a new project. If you have existing tables with the same names, this script will fail. It's designed for a clean setup.

          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "High"
          - Requires-Backup: false
          - Reversible: false
          
          ## Structure Details:
          - Creates tables: `profiles`, `channels`, `contacts`, `tickets`, `messages`, `bulk_campaigns`, `chatbot_flows`.
          - Defines relationships using foreign keys.
          - Creates enums for status types.
          
          ## Security Implications:
          - RLS Status: Enabled on all tables.
          - Policy Changes: Yes, creates initial `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies based on `auth.uid()`.
          - Auth Requirements: Policies are tied to authenticated users.
          
          ## Performance Impact:
          - Indexes: Adds indexes on foreign key columns for better query performance.
          - Triggers: Creates a trigger to automatically create a user profile on new user sign-up.
          - Estimated Impact: Low on an empty database.
          */

-- 1. Create custom types (enums)
CREATE TYPE channel_api_type AS ENUM ('baileys', 'evolution', 'web-js');
CREATE TYPE channel_status AS ENUM ('connected', 'disconnected', 'connecting', 'error');
CREATE TYPE ticket_status AS ENUM ('open', 'pending', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE message_type AS ENUM ('text', 'image', 'audio', 'video', 'document', 'contact');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'completed', 'failed');
CREATE TYPE agent_role AS ENUM ('agent', 'supervisor', 'admin');

-- 2. Create Profiles table to store user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    avatar_url TEXT,
    role agent_role DEFAULT 'agent'::agent_role,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create Channels table
CREATE TABLE public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    api channel_api_type NOT NULL,
    status channel_status DEFAULT 'disconnected'::channel_status,
    qr_code TEXT,
    instance_id TEXT,
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Contacts table
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    avatar TEXT,
    last_seen TIMESTAMPTZ,
    is_group BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX ON public.contacts (user_id, phone);

-- 5. Create Tickets table
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status ticket_status DEFAULT 'open'::ticket_status,
    priority ticket_priority DEFAULT 'low'::ticket_priority,
    department TEXT,
    tags TEXT[],
    rating INT,
    notes TEXT[],
    protocol TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    type message_type NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_from_contact BOOLEAN NOT NULL,
    status message_status DEFAULT 'sent'::message_status,
    file_url TEXT,
    file_name TEXT,
    reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL
);

-- 7. Create Bulk Campaigns table
CREATE TABLE public.bulk_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    message_text TEXT,
    media_url TEXT,
    media_name TEXT,
    targets TEXT[],
    scheduled_at TIMESTAMPTZ,
    status campaign_status DEFAULT 'draft'::campaign_status,
    progress NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create Chatbot Flows table
CREATE TABLE public.chatbot_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    nodes JSONB,
    edges JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Enable RLS and create policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for channels
CREATE POLICY "Users can manage their own channels" ON public.channels FOR ALL USING (auth.uid() = user_id);

-- Policies for contacts
CREATE POLICY "Users can manage their own contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id);

-- Policies for tickets
CREATE POLICY "Users can manage their own tickets" ON public.tickets FOR ALL USING (auth.uid() = user_id);

-- Policies for messages
CREATE POLICY "Users can manage messages in their own tickets" ON public.messages FOR ALL USING (auth.uid() = user_id);

-- Policies for bulk_campaigns
CREATE POLICY "Users can manage their own campaigns" ON public.bulk_campaigns FOR ALL USING (auth.uid() = user_id);

-- Policies for chatbot_flows
CREATE POLICY "Users can manage their own chatbot flows" ON public.chatbot_flows FOR ALL USING (auth.uid() = user_id);

-- 10. Add Indexes for performance
CREATE INDEX ON public.channels (user_id);
CREATE INDEX ON public.contacts (user_id);
CREATE INDEX ON public.tickets (user_id, contact_id, agent_id);
CREATE INDEX ON public.messages (ticket_id, user_id);
CREATE INDEX ON public.bulk_campaigns (user_id, channel_id);
CREATE INDEX ON public.chatbot_flows (user_id);
