-- Step 1: Create user_roles table for proper role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Step 2: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Step 4: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 5: Update get_user_role function to use user_roles table
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- Step 6: Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 7: Update ALL policies that reference profiles.role BEFORE dropping the column

-- Update profiles policies
DROP POLICY IF EXISTS "Privileged roles view all profiles" ON public.profiles;
CREATE POLICY "Privileged roles view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'doctor'::app_role, 'researcher'::app_role])
  );

-- Update uploads policies
DROP POLICY IF EXISTS "Admins, doctors, and researchers can view all uploads" ON public.uploads;
CREATE POLICY "Admins, doctors, and researchers can view all uploads"
  ON public.uploads
  FOR SELECT
  USING (
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'doctor'::app_role, 'researcher'::app_role])
  );

-- Update reports policies
DROP POLICY IF EXISTS "Admins, doctors, and researchers can view all reports" ON public.reports;
CREATE POLICY "Admins, doctors, and researchers can view all reports"
  ON public.reports
  FOR SELECT
  USING (
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'doctor'::app_role, 'researcher'::app_role])
  );

-- Update storage policies for blood-smears bucket
DROP POLICY IF EXISTS "Admins, doctors, and researchers can view all blood smears" ON storage.objects;
CREATE POLICY "Admins, doctors, and researchers can view all blood smears"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'blood-smears' AND
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'doctor'::app_role, 'researcher'::app_role])
  );

-- Step 8: Now safe to drop role column from profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- Step 9: Update handle_new_user trigger to create role entries
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into profiles table (without role)
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  
  -- Insert default 'user' role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user')
  );
  
  RETURN NEW;
END;
$$;

-- Step 10: Add INSERT policy for profiles (allows trigger to work)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);