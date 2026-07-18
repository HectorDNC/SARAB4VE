CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_name TEXT NOT NULL,
  contact_method TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  need_type TEXT NOT NULL,
  description TEXT NOT NULL,
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  urgency TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  volunteer_name TEXT,
  volunteer_contact_method TEXT,
  volunteer_contact_value TEXT,
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE help_requests
  ADD COLUMN IF NOT EXISTS volunteer_name TEXT,
  ADD COLUMN IF NOT EXISTS volunteer_contact_method TEXT,
  ADD COLUMN IF NOT EXISTS volunteer_contact_value TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'help_requests_need_type_check'
  ) THEN
    ALTER TABLE help_requests
      ADD CONSTRAINT help_requests_need_type_check CHECK (need_type IN (
        'equipment',
        'medication',
        'transport',
        'companionship',
        'interpreter',
        'accessible_information',
        'neurodivergent_support',
        'psychosocial_support'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'help_requests_urgency_check'
  ) THEN
    ALTER TABLE help_requests
      ADD CONSTRAINT help_requests_urgency_check CHECK (urgency IN ('low', 'medium', 'high', 'critical'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'help_requests_status_check'
  ) THEN
    ALTER TABLE help_requests
      ADD CONSTRAINT help_requests_status_check CHECK (status IN ('open', 'assigned', 'resolved'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'help_requests_latitude_check'
  ) THEN
    ALTER TABLE help_requests
      ADD CONSTRAINT help_requests_latitude_check CHECK (latitude >= -90 AND latitude <= 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'help_requests_longitude_check'
  ) THEN
    ALTER TABLE help_requests
      ADD CONSTRAINT help_requests_longitude_check CHECK (longitude >= -180 AND longitude <= 180);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'help_requests_assignment_check'
  ) THEN
    ALTER TABLE help_requests
      ADD CONSTRAINT help_requests_assignment_check CHECK (
        (status = 'open' AND volunteer_name IS NULL AND volunteer_contact_method IS NULL
          AND volunteer_contact_value IS NULL AND assigned_at IS NULL)
        OR
        (status IN ('assigned', 'resolved') AND volunteer_name IS NOT NULL
          AND volunteer_contact_method IS NOT NULL AND volunteer_contact_value IS NOT NULL
          AND assigned_at IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'help_requests_resolution_check'
  ) THEN
    ALTER TABLE help_requests
      ADD CONSTRAINT help_requests_resolution_check CHECK (
        (status = 'resolved' AND resolved_at IS NOT NULL)
        OR
        (status IN ('open', 'assigned') AND resolved_at IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS help_requests_status_idx
  ON help_requests (status);

CREATE INDEX IF NOT EXISTS help_requests_created_at_idx
  ON help_requests (created_at DESC);

-- ---------------------------------------------------------------------------
-- Attendees — vinculan emergencies / help_requests con los usuarios que las atienden
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS emergency_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id),
  attended_by UUID NOT NULL REFERENCES users(id),
  attended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (emergency_id, attended_by)
);

CREATE INDEX IF NOT EXISTS emergency_attendees_emergency_id_idx
  ON emergency_attendees (emergency_id);

CREATE TABLE IF NOT EXISTS help_request_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_request_id UUID NOT NULL REFERENCES help_requests(id),
  attended_by UUID NOT NULL REFERENCES users(id),
  attended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (help_request_id, attended_by)
);

CREATE INDEX IF NOT EXISTS help_request_attendees_help_request_id_idx
  ON help_request_attendees (help_request_id);

-- ---------------------------------------------------------------------------
-- Voice emergency reporting — columnas para reportes por voz
-- ---------------------------------------------------------------------------

ALTER TABLE emergencies
  ADD COLUMN IF NOT EXISTS report_origin TEXT NOT NULL DEFAULT 'form';

ALTER TABLE emergencies
  ADD COLUMN IF NOT EXISTS voice_note_url TEXT;

ALTER TABLE emergencies
  ADD COLUMN IF NOT EXISTS transcript TEXT;
