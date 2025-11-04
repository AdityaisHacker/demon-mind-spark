-- Create table to track deleted users
CREATE TABLE IF NOT EXISTS public.deleted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  username text,
  deleted_by text NOT NULL,
  deleted_by_role text NOT NULL,
  deleted_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to check if an email is deleted (for login page)
CREATE POLICY "Anyone can check deleted users"
ON public.deleted_users
FOR SELECT
USING (true);

-- Only admins can insert deleted user records
CREATE POLICY "Admins can insert deleted users"
ON public.deleted_users
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_deleted_users_email ON public.deleted_users(email);