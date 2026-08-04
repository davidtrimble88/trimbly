DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'davidltrimble@staff.trimbly.internal') THEN
    RETURN;
  END IF;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, phone_change, phone_change_token, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'davidltrimble@staff.trimbly.internal',
    extensions.crypt('DuckDuckGoose123#', extensions.gen_salt('bf')),
    now(), '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"David Trimble","user_type":"homeowner"}'::jsonb,
    now(), now()
  );

  BEGIN
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), new_user_id, new_user_id::text,
      jsonb_build_object('sub', new_user_id::text, 'email', 'davidltrimble@staff.trimbly.internal'),
      'email', now(), now(), now()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'auth.identities insert skipped: %', SQLERRM;
  END;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;