-- Create enum for user roles
CREATE TYPE app_role AS ENUM ('admin', 'doctor', 'researcher', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins and doctors can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'researcher')
    )
  );

-- Create uploads table for blood smear images
CREATE TABLE public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  diagnosis_result TEXT,
  probability_score DECIMAL(5,2),
  parasites_detected INTEGER DEFAULT 0,
  heatmap_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on uploads
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Uploads policies
CREATE POLICY "Users can view their own uploads"
  ON public.uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads"
  ON public.uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins, doctors, and researchers can view all uploads"
  ON public.uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'researcher')
    )
  );

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  result_summary TEXT NOT NULL,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Reports policies
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins, doctors, and researchers can view all reports"
  ON public.reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'researcher')
    )
  );

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for blood smear images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blood-smears', 'blood-smears', false);

-- Storage policies for blood smears
CREATE POLICY "Users can upload their own blood smears"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'blood-smears' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own blood smears"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'blood-smears' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins, doctors, and researchers can view all blood smears"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'blood-smears' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'doctor', 'researcher')
    )
  );