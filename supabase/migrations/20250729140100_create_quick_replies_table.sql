/*
  # [Operation] Create Quick Replies Table
  This script creates the 'quick_replies' table to store predefined message snippets for agents.

  ## Query Description:
  - Creates a new table 'quick_replies'.
  - Sets up foreign key to 'auth.users'.
  - Enables Row Level Security (RLS) and defines policies to ensure users can only access their own quick replies.
  - This is a safe operation as it only adds a new table.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping the table)

  ## Security Implications:
  - RLS Status: Enabled
  - Policy Changes: Yes (New policies for this table)
  - Auth Requirements: User must be authenticated
*/
CREATE TABLE IF NOT EXISTS public.quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    shortcut TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.quick_replies IS 'Stores predefined quick replies (snippets) for agents.';

-- Enable RLS
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- Policies for Quick Replies
CREATE POLICY "Users can view their own quick replies"
ON public.quick_replies FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quick replies"
ON public.quick_replies FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quick replies"
ON public.quick_replies FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quick replies"
ON public.quick_replies FOR DELETE
USING (auth.uid() = user_id);
