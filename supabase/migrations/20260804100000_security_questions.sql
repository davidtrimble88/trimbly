-- Account recovery via security questions, as an alternative to (not a
-- replacement for) the existing email reset-link flow. Each user picks 3
-- questions and answers; answers are hashed with the same pgcrypto bcrypt
-- pattern already used for staff account passwords — never stored in plain
-- text, and normalized (trimmed + lowercased) before hashing so recovery
-- doesn't fail over capitalization or stray whitespace.
CREATE TABLE public.security_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  question_1 text NOT NULL,
  answer_1_hash text NOT NULL,
  question_2 text NOT NULL,
  answer_2_hash text NOT NULL,
  question_3 text NOT NULL,
  answer_3_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_questions ENABLE ROW LEVEL SECURITY;

-- Owners can see their own row (harmless — it's their own bcrypt hash, and
-- this is what lets the app check "do I already have questions set up").
-- No INSERT/UPDATE/DELETE policy for authenticated at all: writes must go
-- through set_security_questions() below so hashing can never be skipped.
CREATE POLICY "Users can view own security questions"
  ON public.security_questions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_security_questions_updated
  BEFORE UPDATE ON public.security_questions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Sets (or updates) the current user's own security questions. Answers are
-- normalized and hashed here so plaintext never touches the table directly.
CREATE OR REPLACE FUNCTION public.set_security_questions(
  p_question_1 text, p_answer_1 text,
  p_question_2 text, p_answer_2 text,
  p_question_3 text, p_answer_3 text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_question_1 IS NULL OR p_answer_1 IS NULL OR trim(p_answer_1) = ''
     OR p_question_2 IS NULL OR p_answer_2 IS NULL OR trim(p_answer_2) = ''
     OR p_question_3 IS NULL OR p_answer_3 IS NULL OR trim(p_answer_3) = '' THEN
    RAISE EXCEPTION 'All three questions and answers are required';
  END IF;

  INSERT INTO public.security_questions (
    user_id, question_1, answer_1_hash, question_2, answer_2_hash, question_3, answer_3_hash
  ) VALUES (
    auth.uid(), p_question_1, extensions.crypt(lower(trim(p_answer_1)), extensions.gen_salt('bf')),
    p_question_2, extensions.crypt(lower(trim(p_answer_2)), extensions.gen_salt('bf')),
    p_question_3, extensions.crypt(lower(trim(p_answer_3)), extensions.gen_salt('bf'))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    question_1 = EXCLUDED.question_1, answer_1_hash = EXCLUDED.answer_1_hash,
    question_2 = EXCLUDED.question_2, answer_2_hash = EXCLUDED.answer_2_hash,
    question_3 = EXCLUDED.question_3, answer_3_hash = EXCLUDED.answer_3_hash,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_security_questions(text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_security_questions(text, text, text, text, text, text) TO authenticated;

-- Looks up the question TEXT (never hashes) for the account-recovery page.
-- p_identifier may be a real email or a bare staff username (mapped to
-- <username>@staff.trimbly.internal), matching the same login convention
-- used in src/pages/Auth.tsx. Returns no rows if the account or its
-- questions don't exist — the caller (recover-account edge function)
-- shows the same generic message either way to avoid confirming which.
CREATE OR REPLACE FUNCTION public.get_recovery_questions(p_identifier text)
RETURNS TABLE(question_1 text, question_2 text, question_3 text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_user_id uuid;
BEGIN
  v_email := lower(trim(p_identifier));
  IF position('@' in v_email) = 0 THEN
    v_email := v_email || '@staff.trimbly.internal';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email;
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT sq.question_1, sq.question_2, sq.question_3
  FROM public.security_questions sq
  WHERE sq.user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_recovery_questions(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recovery_questions(text) TO anon, authenticated;

-- Verifies all three answers and, only if every one matches, resets the
-- account's password. Requires all 3 correct (not a majority) since this
-- is a full password-reset primitive for an unauthenticated caller.
CREATE OR REPLACE FUNCTION public.recover_account_via_security_questions(
  p_identifier text, p_answer_1 text, p_answer_2 text, p_answer_3 text, p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_user_id uuid;
  v_row public.security_questions%ROWTYPE;
BEGIN
  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RETURN false;
  END IF;

  v_email := lower(trim(p_identifier));
  IF position('@' in v_email) = 0 THEN
    v_email := v_email || '@staff.trimbly.internal';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email;
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_row FROM public.security_questions WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF extensions.crypt(lower(trim(p_answer_1)), v_row.answer_1_hash) <> v_row.answer_1_hash
     OR extensions.crypt(lower(trim(p_answer_2)), v_row.answer_2_hash) <> v_row.answer_2_hash
     OR extensions.crypt(lower(trim(p_answer_3)), v_row.answer_3_hash) <> v_row.answer_3_hash THEN
    RETURN false;
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')), updated_at = now()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.recover_account_via_security_questions(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_account_via_security_questions(text, text, text, text, text) TO anon, authenticated;
