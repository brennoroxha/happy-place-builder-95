
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous schedule with the same name
DO $$
BEGIN
  PERFORM cron.unschedule('reconcile-sales-every-minute');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'reconcile-sales-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://happy-place-builder-95.lovable.app/api/public/reconcile-sales',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
