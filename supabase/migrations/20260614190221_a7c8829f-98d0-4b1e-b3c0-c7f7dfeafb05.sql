
CREATE POLICY "vehicle-docs: owner reads"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vehicle-docs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "vehicle-docs: owner uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vehicle-docs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "vehicle-docs: owner updates"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'vehicle-docs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "vehicle-docs: owner deletes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vehicle-docs' AND (auth.uid())::text = (storage.foldername(name))[1]);
