ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS stripe_product_key_live text,
  ADD COLUMN IF NOT EXISTS stripe_price_key_live text;