CREATE POLICY "Homeowners can delete own jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (auth.uid() = homeowner_id);

CREATE POLICY "Admins can delete any job"
ON public.jobs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));