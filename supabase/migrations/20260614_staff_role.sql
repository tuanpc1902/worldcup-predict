-- Add staff role to profiles
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'staff', 'admin'));

-- Staff can view admin-relevant data (same as admin select policies)
-- No additional RLS changes needed — staff actions go through service-role API routes
-- which already bypass RLS.
