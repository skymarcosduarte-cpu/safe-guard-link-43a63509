CREATE TABLE public.quake_alerts_sent (
  event_id text PRIMARY KEY,
  magnitude double precision NOT NULL,
  place text,
  occurred_at timestamptz NOT NULL,
  push_sent integer NOT NULL DEFAULT 0,
  emails_sent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.quake_alerts_sent TO service_role;
ALTER TABLE public.quake_alerts_sent ENABLE ROW LEVEL SECURITY;