ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS stripe_product_key text,
  ADD COLUMN IF NOT EXISTS stripe_price_key text;

ALTER TABLE public.invoice_requests
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'aud',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS hosted_invoice_url text,
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.invoice_requests
  DROP CONSTRAINT IF EXISTS invoice_requests_status_check;
ALTER TABLE public.invoice_requests
  ADD CONSTRAINT invoice_requests_status_check
  CHECK (status IN ('pending','sent','paid','void','uncollectible','failed'));

CREATE UNIQUE INDEX IF NOT EXISTS invoice_requests_stripe_invoice_id_key
  ON public.invoice_requests (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS invoice_requests_ip_hash_created_at_idx
  ON public.invoice_requests (ip_hash, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_invoice_requests_updated_at ON public.invoice_requests;
CREATE TRIGGER update_invoice_requests_updated_at
  BEFORE UPDATE ON public.invoice_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();