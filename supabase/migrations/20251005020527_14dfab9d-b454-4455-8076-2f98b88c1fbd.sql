-- Add patient information fields to reports table
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS patient_bio TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS malaria_species TEXT;

-- Add DELETE policy for uploads so users can delete their own uploads
DROP POLICY IF EXISTS "Users can delete their own uploads" ON public.uploads;
CREATE POLICY "Users can delete their own uploads"
  ON public.uploads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add UPDATE policy for reports so users can add patient info
DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
CREATE POLICY "Users can update their own reports"
  ON public.reports
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for privileged roles to update reports
DROP POLICY IF EXISTS "Privileged roles can update reports" ON public.reports;
CREATE POLICY "Privileged roles can update reports"
  ON public.reports
  FOR UPDATE
  USING (
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'doctor'::app_role, 'researcher'::app_role])
  )
  WITH CHECK (
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'doctor'::app_role, 'researcher'::app_role])
  );