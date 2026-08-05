export const CONDITIONAL_SYNC_SQL = `CREATE OR REPLACE FUNCTION upsert_sync_if_unchanged(
  p_data TEXT,
  p_expected_updated_at TIMESTAMPTZ
)
RETURNS TABLE(outcome TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_at TIMESTAMPTZ;
BEGIN
  IF p_expected_updated_at IS NULL THEN
    INSERT INTO public.sync_data (id, data, updated_at)
    VALUES ('NTE Flowboard', p_data, now())
    ON CONFLICT (id) DO NOTHING
    RETURNING sync_data.updated_at INTO v_updated_at;
  ELSE
    UPDATE public.sync_data AS target
    SET data = p_data
    WHERE target.id = 'NTE Flowboard'
      AND target.updated_at = p_expected_updated_at
    RETURNING target.updated_at INTO v_updated_at;
  END IF;

  IF v_updated_at IS NOT NULL THEN
    RETURN QUERY SELECT 'applied'::TEXT, v_updated_at;
    RETURN;
  END IF;

  SELECT target.updated_at
  INTO v_updated_at
  FROM public.sync_data AS target
  WHERE target.id = 'NTE Flowboard';

  RETURN QUERY SELECT 'conflict'::TEXT, v_updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION flowboard_sync_capabilities()
RETURNS TEXT[]
LANGUAGE sql
STABLE
AS $$
  SELECT ARRAY['conditional_write_v1']::TEXT[];
$$;`

export const BACKGROUND_SYNC_PATCH_SQL = `CREATE OR REPLACE FUNCTION set_sync_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_data_set_updated_at ON sync_data;
CREATE TRIGGER sync_data_set_updated_at
  BEFORE UPDATE ON sync_data
  FOR EACH ROW
  EXECUTE FUNCTION set_sync_updated_at();

${CONDITIONAL_SYNC_SQL}`
