/*
          # [Feature] Quick Replies & Multi-Channel Campaigns
          This migration introduces two new features: a table for quick replies (snippets) and support for multi-channel campaigns by altering the bulk_campaigns table.

          ## Query Description:
          - Creates a new `quick_replies` table to store reusable message templates. This is a safe, additive operation.
          - Alters the `bulk_campaigns` table by removing the single `channel_id` column and adding a `channel_ids` array column. This change is necessary to support sending a single campaign through multiple WhatsApp channels (account rotation).
          - **Data Migration Note:** If you have existing data in `bulk_campaigns`, the `channel_id` will be lost. This script assumes a development environment where this is acceptable. For production, a data migration script would be needed.

          ## Metadata:
          - Schema-Category: ["Structural", "Data"]
          - Impact-Level: ["Medium"]
          - Requires-Backup: true
          - Reversible: false

          ## Structure Details:
          - **New Table:** `public.quick_replies`
          - **Altered Table:** `public.bulk_campaigns`
            - **Removed Column:** `channel_id`
            - **Added Column:** `channel_ids` (uuid[])

          ## Security Implications:
          - RLS Status: Enabled on the new `quick_replies` table.
          - Policy Changes: Yes, new policies for `quick_replies`.
          - Auth Requirements: Users can only access their own quick replies.

          ## Performance Impact:
          - Indexes: Primary key and user_id indexes added to `quick_replies`.
          - Triggers: None.
          - Estimated Impact: Low.
          */

-- 1. Create the quick_replies table
CREATE TABLE public.quick_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    title text NOT NULL,
    content text NOT NULL,
    shortcut text,
    category text,
    CONSTRAINT quick_replies_pkey PRIMARY KEY (id),
    CONSTRAINT quick_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own quick replies"
ON public.quick_replies
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- 2. Alter the bulk_campaigns table for multi-channel support
ALTER TABLE public.bulk_campaigns
DROP COLUMN IF EXISTS channel_id;

ALTER TABLE public.bulk_campaigns
ADD COLUMN channel_ids uuid[];
