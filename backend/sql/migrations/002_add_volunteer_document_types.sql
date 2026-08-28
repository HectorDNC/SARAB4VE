-- Migración: agregar document_types faltantes para voluntarios y corregir
-- la restricción UNIQUE de "code" para que sea por (code, entity_type).
-- Fecha: 2026-08-24
--
-- Motivo: el registro de voluntarios en el frontend pide documentos
-- (fotografia, certificados_titulaciones, certificado_delitos_sexuales,
-- compromiso_etico, proteccion_datos, licencia_conducir,
-- carnet_manipulador_alimentos) que no existen todavía en document_types.
-- Además, el seed original (verification_schema.sql) ya intenta insertar
-- code='identificacion' dos veces (para volunteer_professional y para
-- volunteer_non_professional), lo cual es incompatible con la restricción
-- `code VARCHAR(50) UNIQUE NOT NULL` tal como está declarada en ese archivo
-- (UNIQUE global, no por entidad). Esta migración corrige eso a
-- UNIQUE(code, entity_type), que es lo que el propio seed ya asume.
--
-- IMPORTANTE: no se pudo probar contra la base de datos real (sin acceso
-- desde este entorno). Revisar en un ambiente de staging antes de aplicar
-- en producción. Todo lo que sigue es aditivo o corrige una restricción —
-- no toca ninguna fila de organización (códigos 1-7) ni ninguna otra tabla.

-- 1. Reemplazar la restricción UNIQUE(code) por UNIQUE(code, entity_type),
--    sin asumir el nombre exacto que Postgres le haya dado a la actual.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'document_types'
    AND con.contype = 'u'
    AND (
      SELECT array_agg(attname::text ORDER BY attname)
      FROM pg_attribute
      WHERE attrelid = con.conrelid AND attnum = ANY(con.conkey)
    ) = ARRAY['code'];

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE document_types DROP CONSTRAINT %I', constraint_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'document_types'
      AND con.contype = 'u'
      AND con.conname = 'document_types_code_entity_type_key'
  ) THEN
    ALTER TABLE document_types
      ADD CONSTRAINT document_types_code_entity_type_key UNIQUE (code, entity_type);
  END IF;
END $$;

-- 2. Documentos faltantes — voluntario profesional
--    ("curriculum" ya existe del seed original, no se duplica)
INSERT INTO document_types (code, name, entity_type, is_required)
SELECT * FROM (VALUES
  ('identidad', 'Documento de identidad', 'volunteer_professional'::entity_type, true),
  ('fotografia', 'Fotografía', 'volunteer_professional'::entity_type, true),
  ('certificados_titulaciones', 'Certificados y Titulaciones', 'volunteer_professional'::entity_type, true),
  ('certificado_delitos_sexuales', 'Certificado de delitos sexuales', 'volunteer_professional'::entity_type, false),
  ('compromiso_etico', 'Compromiso ético', 'volunteer_professional'::entity_type, true),
  ('proteccion_datos', 'Protección de datos', 'volunteer_professional'::entity_type, true)
) AS v(code, name, entity_type, is_required)
WHERE NOT EXISTS (
  SELECT 1 FROM document_types dt
  WHERE dt.code = v.code AND dt.entity_type = v.entity_type
);

-- 3. Documentos faltantes — voluntario no profesional
INSERT INTO document_types (code, name, entity_type, is_required)
SELECT * FROM (VALUES
  ('identidad', 'Documento de identidad', 'volunteer_non_professional'::entity_type, true),
  ('fotografia', 'Fotografía', 'volunteer_non_professional'::entity_type, true),
  ('licencia_conducir', 'Licencia de conducir', 'volunteer_non_professional'::entity_type, true),
  ('carnet_manipulador_alimentos', 'Carnet de manipulador de alimentos', 'volunteer_non_professional'::entity_type, true)
) AS v(code, name, entity_type, is_required)
WHERE NOT EXISTS (
  SELECT 1 FROM document_types dt
  WHERE dt.code = v.code AND dt.entity_type = v.entity_type
);
