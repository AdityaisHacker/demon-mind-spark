-- Drop the existing user update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policy that prevents users from changing unlimited status
CREATE POLICY "Users can update their own profile (except unlimited)"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND (
    -- User can only update if they're not changing the unlimited field
    -- OR if they are admin
    (unlimited IS NOT DISTINCT FROM (SELECT unlimited FROM public.profiles WHERE id = auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Ensure only admins can set unlimited to true
CREATE POLICY "Only admins can grant unlimited credits"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (unlimited IS NOT DISTINCT FROM (SELECT unlimited FROM public.profiles WHERE id = auth.uid()))
);