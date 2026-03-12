
CREATE TABLE public.email_optouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  business_name text,
  opted_out_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (email)
);

ALTER TABLE public.email_optouts ENABLE ROW LEVEL SECURITY;
