-- Schedule the fallback embedding worker once per minute.
-- Remains idle until both Vault secrets exist: embed_worker_base_url, cron_secret.
-- Deploy with `supabase db push --remote --skip-vault` if local [db.vault] differs.
SELECT cron.schedule(
	'embedding-worker',
	'* * * * *',
	$job$
		WITH worker_config AS (
			SELECT
				max(decrypted_secret) FILTER (
					WHERE name = 'embed_worker_base_url'
				) AS base_url,
				max(decrypted_secret) FILTER (
					WHERE name = 'cron_secret'
				) AS cron_secret
			FROM vault.decrypted_secrets
		)
		SELECT net.http_post(
			url := rtrim(worker_config.base_url, '/') || '/api/embed-pending',
			headers := jsonb_build_object(
				'Content-Type', 'application/json',
				'Authorization', 'Bearer ' || worker_config.cron_secret
			),
			body := '{}'::jsonb,
			timeout_milliseconds := 55000
		)
		FROM worker_config
		WHERE nullif(btrim(worker_config.base_url), '') IS NOT NULL
			AND nullif(btrim(worker_config.cron_secret), '') IS NOT NULL;
	$job$
);
