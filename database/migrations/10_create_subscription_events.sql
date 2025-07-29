-- 10. CREATE TABLE subscription_events
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'created', 'activated', 'paused', 'resumed', 'canceled', 
    'plan_changed', 'payment_succeeded', 'payment_failed',
    'trial_started', 'trial_extended', 'trial_converted', 'trial_expired',
    'payment_method_added', 'payment_method_removed', 'payment_method_updated'
  )),
  event_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  webhook_id text NULL, -- Store Stripe webhook ID for correlation
  processing_duration_ms integer NULL, -- For webhook performance monitoring
  retry_count integer DEFAULT 0,
  CONSTRAINT subscription_events_pkey PRIMARY KEY (id)
); 