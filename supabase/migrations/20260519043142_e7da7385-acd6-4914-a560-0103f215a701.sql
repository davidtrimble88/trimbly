-- Add new staff role levels
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analyst';