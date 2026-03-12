
CREATE POLICY "Users can delete own sent or received messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
