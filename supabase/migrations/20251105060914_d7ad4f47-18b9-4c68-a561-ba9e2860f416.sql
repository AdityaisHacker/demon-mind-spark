-- Create trigger function to log all login attempts
CREATE OR REPLACE FUNCTION public.log_login_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log successful logins
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    INSERT INTO public.login_attempts (
      email,
      ip_address,
      user_agent,
      success
    ) VALUES (
      NEW.email,
      NEW.raw_app_meta_data->>'ip_address',
      NEW.raw_user_meta_data->>'user_agent',
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

-- Create trigger on auth.users table to track successful logins
CREATE TRIGGER on_auth_user_login
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_login_attempt();

-- Function to log failed login attempts (call this from your auth error handler)
CREATE OR REPLACE FUNCTION public.log_failed_login(
  p_email text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (
    email,
    ip_address,
    user_agent,
    success
  ) VALUES (
    p_email,
    p_ip_address,
    p_user_agent,
    false
  );
END;
$$;