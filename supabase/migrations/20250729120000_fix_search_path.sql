/*
# [SECURITY] Set search_path for handle_new_user function
This migration updates the handle_new_user function to explicitly set the search_path. This is a security best practice to prevent potential function hijacking by ensuring the function resolves objects from expected schemas.

## Query Description: [This operation modifies an existing database function to enhance security. It is a safe, non-destructive change and does not affect existing data. No backup is required.]

## Metadata:
- Schema-Category: ["Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Function affected: public.handle_new_user

## Security Implications:
- RLS Status: [Not Applicable]
- Policy Changes: [No]
- Auth Requirements: [No]
- Mitigates: [WARN] Function Search Path Mutable

## Performance Impact:
- Indexes: [Not Applicable]
- Triggers: [Not Applicable]
- Estimated Impact: [None]
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Explicitly set search path
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'agent'
  );
  RETURN new;
END;
$$;
