
-- Create test user account with full access
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'davidharrisontrimble@icloud.com';

  IF new_user_id IS NULL THEN
    new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'davidharrisontrimble@icloud.com',
      crypt('Fredsaw3#', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"David Trimble","user_type":"homeowner"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', 'davidharrisontrimble@icloud.com', 'email_verified', true),
      'email',
      new_user_id::text,
      now(), now(), now()
    );
  END IF;

  -- Ensure profile exists with Pro tier
  INSERT INTO public.profiles (id, full_name, user_type, subscription_tier)
  VALUES (new_user_id, 'David Trimble', 'homeowner', 'multi_pro')
  ON CONFLICT (id) DO UPDATE SET subscription_tier = 'multi_pro', user_type = 'homeowner';

  -- Grant admin role for full testing access
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin')
  ON CONFLICT DO NOTHING;
END $$;
