-- Drop the old problematic policy that references auth.users
DROP POLICY IF EXISTS "Privileged roles view all profiles" ON public.profiles;

-- Recreate security definer function if needed
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Create new policy using the security definer function
CREATE POLICY "Privileged roles view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'doctor', 'researcher'));