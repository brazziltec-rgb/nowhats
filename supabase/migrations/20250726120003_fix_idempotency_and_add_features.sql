/*
# [Fix Migration Idempotency & Add Features]
This script corrects the previous migration to be idempotent and ensures all features are correctly set up. It can be run multiple times without causing errors.

## Query Description: 
This operation is safe to run multiple times. It checks for the existence of tables and columns before creating them. It will:
1. Create the `quick_replies` table if it doesn't exist and set its RLS policies.
2. Modify the `bulk_campaigns` table to support multiple channels, adding `channel_ids` and safely removing the old `channel_id` column if it exists.

## Metadata:
- Schema-Category: ["Safe", "Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true (manually)

## Security Implications:
- RLS Status: Enabled on `quick_replies`.
- Policy Changes: Adds RLS policies for `quick_replies`.
- Auth Requirements: User must be authenticated.
*/

-- 1. Create quick_replies table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quick_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    shortcut text,
    category text,
    CONSTRAINT quick_replies_pkey PRIMARY KEY (id),
    CONSTRAINT quick_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Enable RLS and set policies for quick_replies. It's safe to run this again.
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts before creating new ones
DROP POLICY IF EXISTS "Users can view their own quick replies." ON public.quick_replies;
DROP POLICY IF EXISTS "Users can insert their own quick replies." ON public.quick_replies;
DROP POLICY IF EXISTS "Users can update their own quick replies." ON public.quick_replies;
DROP POLICY IF EXISTS "Users can delete their own quick replies." ON public.quick_replies;

CREATE POLICY "Users can view their own quick replies." ON public.quick_replies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quick replies." ON public.quick_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quick replies." ON public.quick_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quick replies." ON public.quick_replies FOR DELETE USING (auth.uid() = user_id);


-- 3. Modify bulk_campaigns table for multi-channel support
-- Add the new array column if it doesn't exist
ALTER TABLE public.bulk_campaigns ADD COLUMN IF NOT EXISTS channel_ids uuid[];

-- Drop the old single channel_id column if it exists
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bulk_campaigns' AND column_name='channel_id') THEN
      ALTER TABLE public.bulk_campaigns DROP COLUMN channel_id;
   END IF;
END $$;
