-- infra/seeds/compute_aggregates.sql
-- Deterministic computed-field functions used by Snapshot Oracle and validators.
-- Keep logic consistent with server SRS engine (see functions/lib/srsEngine.ts)

-- 1) Calculate per-card mastery percentage using ease/repetitions/interval
CREATE OR REPLACE FUNCTION calculate_mastery(ease numeric, repetitions int, interval int)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE
  mastery numeric := 0;
BEGIN
  IF repetitions >= 5 AND ease >= 2.5 THEN
    mastery := 90 + (ease - 2.5) * 4;
  ELSIF repetitions >= 3 THEN
    mastery := 60 + (ease - 1.3) * 20;
  ELSIF repetitions >= 1 THEN
    mastery := 30 + repetitions * 15;
  ELSE
    mastery := 0;
  END IF;

  IF interval > 7 THEN
    mastery := LEAST(100, mastery + 10);
  END IF;

  -- Round and clamp
  mastery := GREATEST(0, LEAST(100, round(mastery)));
  RETURN mastery;
END;
$$;

-- 2) Per-user average mastery across srs_data (returns numeric 0-100)
CREATE OR REPLACE FUNCTION user_average_mastery(p_user_id uuid)
RETURNS numeric LANGUAGE sql AS $$
  SELECT CASE WHEN count(*) = 0 THEN 0
    ELSE round(avg(calculate_mastery(ease, repetitions, COALESCE(interval, 0))))
  END::numeric
  FROM srs_data WHERE user_id = p_user_id;
$$;

-- 3) Global SRS aggregates (compatible shape for Snapshot Oracle)
CREATE OR REPLACE FUNCTION srs_global_aggregates()
RETURNS TABLE(
  total_rows bigint,
  total_repetitions bigint,
  average_ease numeric,
  average_quality numeric,
  reviewed_count bigint,
  average_mastery numeric
) LANGUAGE sql AS $$
  SELECT
    COUNT(id) as total_rows,
    COALESCE(SUM(repetitions),0) as total_repetitions,
    COALESCE(AVG(ease),0) as average_ease,
    COALESCE(AVG(quality),0) as average_quality,
    COALESCE(COUNT(last_review),0) as reviewed_count,
    COALESCE(ROUND(AVG(calculate_mastery(ease, repetitions, COALESCE(interval,0)))),0) as average_mastery
  FROM srs_data;
$$;

-- 4) User progress aggregates used by Snapshot Oracle
CREATE OR REPLACE FUNCTION user_progress_aggregates()
RETURNS TABLE(total_points bigint, average_level numeric, actor_count bigint) LANGUAGE sql AS $$
  SELECT COALESCE(SUM(points),0) as total_points, COALESCE(ROUND(AVG(level),2),0) as average_level, COALESCE(COUNT(id),0) as actor_count FROM user_progress;
$$;

-- 5) API usage monthly summary for a given user and period (YYYY-MM)
CREATE OR REPLACE FUNCTION api_usage_monthly(p_user_id uuid, p_period text)
RETURNS TABLE(tokens bigint, total_cost numeric) LANGUAGE sql AS $$
  SELECT COALESCE(SUM(tokens_used),0) as tokens, COALESCE(SUM(cost),0)::numeric as total_cost
  FROM user_api_usage
  WHERE user_id = p_user_id AND period = p_period;
$$;

-- Notes:
-- - These functions are deliberately side-effect free and deterministic so they can be used by snapshot/validator tooling.
-- - Keep them in sync with `functions/lib/srsEngine.ts` and any JS/TS SRS implementations (mastery formula).
