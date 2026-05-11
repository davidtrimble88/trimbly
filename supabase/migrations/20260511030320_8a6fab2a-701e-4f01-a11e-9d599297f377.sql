
CREATE TABLE public.service_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  frequency TEXT NOT NULL DEFAULT 'monthly', -- monthly, quarterly, biannual, annual
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active service plans" ON public.service_plans
  FOR SELECT USING (active = true OR provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can insert own plans" ON public.service_plans
  FOR INSERT WITH CHECK (provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can update own plans" ON public.service_plans
  FOR UPDATE USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can delete own plans" ON public.service_plans
  FOR DELETE USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE TRIGGER trg_service_plans_updated_at
  BEFORE UPDATE ON public.service_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_contact_messages_updated_at();

CREATE TABLE public.plan_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  homeowner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, cancelled
  next_service_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homeowners can view own subscriptions" ON public.plan_subscriptions
  FOR SELECT USING (auth.uid() = homeowner_id);

CREATE POLICY "Providers can view subscriptions to own plans" ON public.plan_subscriptions
  FOR SELECT USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE POLICY "Homeowners can subscribe" ON public.plan_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = homeowner_id);

CREATE POLICY "Homeowners can update own subscriptions" ON public.plan_subscriptions
  FOR UPDATE USING (auth.uid() = homeowner_id);

CREATE POLICY "Providers can update subscriptions to own plans" ON public.plan_subscriptions
  FOR UPDATE USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE POLICY "Homeowners can cancel own subscriptions" ON public.plan_subscriptions
  FOR DELETE USING (auth.uid() = homeowner_id);

CREATE TRIGGER trg_plan_subs_updated_at
  BEFORE UPDATE ON public.plan_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_contact_messages_updated_at();
