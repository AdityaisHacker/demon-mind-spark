-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create function to notify user when banned
CREATE OR REPLACE FUNCTION public.notify_user_on_ban()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If banned status changed to true
  IF NEW.banned = true AND (OLD.banned IS NULL OR OLD.banned = false) THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.id,
      'Account Banned',
      'Your account has been banned by an administrator. If you believe this is a mistake, please contact support.',
      'error'
    );
  END IF;
  
  -- If unbanned
  IF NEW.banned = false AND OLD.banned = true THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.id,
      'Account Unbanned',
      'Your account has been unbanned. You can now use the application normally.',
      'success'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER on_profile_ban_change
  AFTER UPDATE OF banned ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_on_ban();

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);