-- Update existing profiles to have correct default values
UPDATE public.profiles
SET credits = 0, unlimited = false
WHERE credits IS NULL OR unlimited IS NULL;

-- Set better defaults for future inserts
ALTER TABLE public.profiles
ALTER COLUMN credits SET DEFAULT 0,
ALTER COLUMN unlimited SET DEFAULT false,
ALTER COLUMN status SET DEFAULT 'free';