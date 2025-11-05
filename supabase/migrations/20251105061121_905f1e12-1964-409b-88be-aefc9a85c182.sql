-- Add metadata jsonb column to login_attempts table for storing country and other info
ALTER TABLE public.login_attempts 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;