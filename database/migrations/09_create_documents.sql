-- 9. CREATE TABLE documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Document identification
  type text NOT NULL CHECK (type IN ('invoice', 'receipt', 'statement', 'contract')),
  title text NOT NULL,
  description text NULL,
  -- Stripe integration
  stripe_id text NULL, -- Invoice ID, Payment Intent ID, etc.
  download_url text NULL, -- Direct PDF download URL
  hosted_url text NULL, -- Stripe hosted page URL
  -- Financial details
  amount integer NULL, -- Amount in paise
  currency text DEFAULT 'INR',
  status text NULL, -- 'paid', 'pending', 'failed', etc.
  -- Organization
  document_date date NOT NULL DEFAULT CURRENT_DATE, -- Invoice date or payment date
  tags text[] DEFAULT '{}', -- Custom tags for organization
  -- Metadata and audit
  metadata jsonb DEFAULT '{}',
  file_size_bytes integer NULL,
  mime_type text DEFAULT 'application/pdf',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_stripe_id_unique UNIQUE (stripe_id)
); 