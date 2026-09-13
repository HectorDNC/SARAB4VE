-- Migración: crear citizen_profiles
-- Fecha: 2026-09-13
--
-- Motivo: el ciudadano necesita un perfil persistente con su información de
-- discapacidad, igual que voluntarios y organizaciones tienen sus tablas
-- (volunteer_profiles / organization_profiles). Hasta ahora esos datos solo
-- se guardaban por evento (emergencies / help_requests), no a nivel de cuenta.
--
-- Reutiliza el mismo catálogo de valores que el formulario de emergencias
-- (visual/auditiva/neuro/motriz + subcategorías + modo de comunicación).
-- Aditiva: no toca filas ni tablas existentes.

CREATE TABLE IF NOT EXISTS citizen_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  disability_type TEXT,              -- visual | auditiva | neuro | motriz
  disability_subcategory TEXT,       -- guia_voz, silla_ruedas, etc.
  communication_mode TEXT,           -- lengua_senas, audifono, etc. (solo auditiva)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'citizen_profiles_disability_type_check'
  ) THEN
    ALTER TABLE citizen_profiles
      ADD CONSTRAINT citizen_profiles_disability_type_check
      CHECK (disability_type IS NULL OR disability_type IN ('visual', 'auditiva', 'neuro', 'motriz'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'citizen_profiles_subcategory_check'
  ) THEN
    ALTER TABLE citizen_profiles
      ADD CONSTRAINT citizen_profiles_subcategory_check
      CHECK (disability_subcategory IS NULL OR disability_subcategory IN (
        'guia_voz', 'braille', 'perro_guia',
        'ambiente_calmado', 'comunicacion_clara', 'acompanamiento',
        'silla_ruedas', 'traslado_asistido', 'evacuacion_accesible'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'citizen_profiles_communication_mode_check'
  ) THEN
    ALTER TABLE citizen_profiles
      ADD CONSTRAINT citizen_profiles_communication_mode_check
      CHECK (communication_mode IS NULL OR communication_mode IN (
        'lengua_senas', 'audifono', 'implante_coclear', 'vibrador_oseo'
      ));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_citizen_profiles_updated_at ON citizen_profiles;
CREATE TRIGGER trg_citizen_profiles_updated_at
  BEFORE UPDATE ON citizen_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
