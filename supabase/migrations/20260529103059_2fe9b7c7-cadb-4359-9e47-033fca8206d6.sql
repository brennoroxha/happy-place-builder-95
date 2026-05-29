
CREATE TABLE public.page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  path text NOT NULL,
  event_type text NOT NULL DEFAULT 'view',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_events_created_at ON public.page_events (created_at DESC);
CREATE INDEX idx_page_events_path ON public.page_events (path);
CREATE INDEX idx_page_events_session ON public.page_events (session_id);

GRANT ALL ON public.page_events TO service_role;

ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;
