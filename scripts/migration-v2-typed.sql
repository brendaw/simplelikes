-- Migration step: infer type from slug prefix
-- Run AFTER migration-v1-to-v2.sql has been applied.
--
-- Extracts content type from the slug prefix code (artigos-, notas-, etc.)
-- so that existing likes are correctly segregated by type.
--
-- Slugs without a known prefix remain as the default 'untyped'.
-- This preserves test data and any slugs that don't follow the pattern.

-- Preview first — run the commented SELECT before applying updates
-- SELECT slug, type AS old_type,
--   CASE
--     WHEN slug LIKE 'artigos-%'    THEN 'artigos'
--     WHEN slug LIKE 'notas-%'      THEN 'notas'
--     WHEN slug LIKE 'curadoria-%'  THEN 'curadoria'
--     WHEN slug LIKE 'palestras-%'  THEN 'palestras'
--     WHEN slug LIKE 'fotografias-%' THEN 'fotografias'
--     ELSE type
--   END AS new_type,
--   count
-- FROM likes ORDER BY slug;

UPDATE likes SET type =
  CASE
    WHEN slug LIKE 'artigos-%'    THEN 'artigos'
    WHEN slug LIKE 'notas-%'      THEN 'notas'
    WHEN slug LIKE 'curadoria-%'  THEN 'curadoria'
    WHEN slug LIKE 'palestras-%'  THEN 'palestras'
    WHEN slug LIKE 'fotografias-%' THEN 'fotografias'
    ELSE type
  END;

UPDATE likes_visitors SET type =
  CASE
    WHEN slug LIKE 'artigos-%'    THEN 'artigos'
    WHEN slug LIKE 'notas-%'      THEN 'notas'
    WHEN slug LIKE 'curadoria-%'  THEN 'curadoria'
    WHEN slug LIKE 'palestras-%'  THEN 'palestras'
    WHEN slug LIKE 'fotografias-%' THEN 'fotografias'
    ELSE type
  END;

-- Verify after
-- SELECT slug, type, count FROM likes ORDER BY slug;
-- SELECT type, count(*) AS rows, SUM(count) AS total_likes FROM likes GROUP BY type ORDER BY type;
