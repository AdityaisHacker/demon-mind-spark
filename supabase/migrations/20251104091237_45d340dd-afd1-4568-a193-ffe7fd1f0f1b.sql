-- Add banned column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banned boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON public.profiles(banned);