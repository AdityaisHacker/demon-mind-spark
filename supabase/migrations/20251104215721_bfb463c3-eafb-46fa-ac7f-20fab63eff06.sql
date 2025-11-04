-- Enable realtime for profiles table
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- Add profiles table to realtime publication if not already added
DO $$
BEGIN
  -- Check if the publication exists and add the table if needed
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- This will add the table if it's not already in the publication
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already exists in publication, ignore
    NULL;
END $$;