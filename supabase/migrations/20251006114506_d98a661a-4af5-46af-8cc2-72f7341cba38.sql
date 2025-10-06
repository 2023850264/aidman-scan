-- Add bio column to profiles table
ALTER TABLE public.profiles
ADD COLUMN bio text;

-- Add a comment to the column
COMMENT ON COLUMN public.profiles.bio IS 'User biography/description';