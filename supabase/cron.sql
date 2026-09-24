-- OPCIONAL: envío automático de promociones al iniciar su vigencia.
-- Requiere habilitar las extensiones pg_cron y pg_net en Database → Extensions,
-- y reemplazar los dos valores marcados con <...> antes de ejecutar.
--
-- Una vez por hora llama a la función enviar-promocion en modo automático: manda
-- el mail de cada promoción con "enviar_auto" activo, vigente y todavía no enviada.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('enviar-promociones') where exists (select 1 from cron.job where jobname = 'enviar-promociones');

select cron.schedule(
  'enviar-promociones',
  '5 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/enviar-promocion',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{"auto": true}'::jsonb
  );
  $$
);
