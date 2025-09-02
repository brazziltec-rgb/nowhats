/*
          # [Fix Idempotency and Finalize Schema]
          This script ensures the database schema is correctly set up for multi-channel campaigns and quick replies. It is designed to be idempotent, meaning it can be run multiple times without causing errors by checking for the existence of objects before creating them.

          ## Query Description: This operation will safely create the 'quick_replies' table and add the 'channel_ids' column to the 'bulk_campaigns' table if they do not already exist. It will not affect any existing data.
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Tables affected: 'quick_replies', 'bulk_campaigns'
          - Columns added: 'bulk_campaigns.channel_ids'
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes] - Adds RLS policies to 'quick_replies' if they don't exist.
          - Auth Requirements: [Authenticated Users]
          
          ## Performance Impact:
          - Indexes: [None]
          - Triggers: [None]
          - Estimated Impact: [Low]
          */

-- Create the quick_replies table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quick_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    shortcut text,
    category text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT quick_replies_pkey PRIMARY KEY (id),
    CONSTRAINT quick_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add RLS policy for quick_replies if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polname = 'Enable access for authenticated users only' AND polrelid = 'public.quick_replies'::regclass
    ) THEN
        ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Enable access for authenticated users only" ON public.quick_replies FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;


-- Add the channel_ids column to bulk_campaigns only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bulk_campaigns' AND column_name = 'channel_ids'
    ) THEN
        ALTER TABLE public.bulk_campaigns ADD COLUMN channel_ids uuid[];
    END IF;
END $$;
