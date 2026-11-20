CREATE SCHEMA IF NOT EXISTS game;
REVOKE ALL ON SCHEMA game FROM PUBLIC;
REVOKE ALL ON SCHEMA game FROM anon, authenticated;
GRANT USAGE ON SCHEMA game TO service_role;

CREATE OR REPLACE FUNCTION public.game_exec_sql(q text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = game, public, extensions
AS $fn$
DECLARE
  rec record;
  out_rows jsonb[] := ARRAY[]::jsonb[];
  n bigint := 0;
BEGIN
  IF q ~* '^\s*(select|with|values|table|show|explain)\M' OR q ~* '\mreturning\M' THEN
    BEGIN
      FOR rec IN EXECUTE q LOOP
        out_rows := out_rows || to_jsonb(rec);
        n := n + 1;
      END LOOP;
      RETURN jsonb_build_object('rows', to_jsonb(out_rows), 'rowCount', n);
    EXCEPTION WHEN invalid_cursor_definition THEN
      -- statement does not return rows (e.g. "returning" appeared inside a literal)
      NULL;
    END;
  END IF;
  EXECUTE q;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('rows', '[]'::jsonb, 'rowCount', n);
END;
$fn$;

REVOKE ALL ON FUNCTION public.game_exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.game_exec_sql(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.game_exec_sql(text) TO service_role;