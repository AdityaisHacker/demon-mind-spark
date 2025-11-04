-- Fix deleted_users table public exposure
-- Remove the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can check deleted users" ON public.deleted_users;

-- Add restricted policy for authenticated login flow only
CREATE POLICY "Users can check if their email was deleted"
ON public.deleted_users FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));