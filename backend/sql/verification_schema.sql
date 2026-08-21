CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- Esquema: Verificación de Organizaciones y Voluntarios
-- Proyecto: SARA
-- Depende de: users(id) UUID ya existente
-- Nota: organization_profiles y volunteer_profiles complementan (no
-- reemplazan) a user_details. Los campos organization_name, legal_document
-- y work_area de user_details quedan como candidatos a deprecar una vez
-- migrados los datos a las tablas nuevas.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Tipos enumerados
-- -------------------------------------------------------------------------
CREATE TYPE entity_type AS ENUM (
  'organization',
  'volunteer_professional',
  'volunteer_non_professional'
);

CREATE TYPE verification_status AS ENUM (
  'entregada',
  'en_estudio',
  'rechazada',
  'aceptada'
);

CREATE TYPE document_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE volunteer_type AS ENUM (
  'professional',
  'non_professional'
);

CREATE TYPE availability_mode AS ENUM (
  'presential',
  'online',
  'both'
);

-- Discriminador de la tabla catalog unificada
CREATE TYPE catalog_type AS ENUM (
  'organization_type',
  'disability_type',
  'service',
  'interest_area',
  'experience_category'
);

-- Función genérica de updated_at (omitir si ya existe en el proyecto)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------------------
-- Catálogo unificado
-- Reemplaza a organization_types, disability_types, services,
-- interest_areas y experience_categories. document_types se mantiene
-- aparte porque tiene forma distinta (code, entity_type, is_required).
-- -------------------------------------------------------------------------
CREATE TABLE catalog (
  id SERIAL PRIMARY KEY,
  type catalog_type NOT NULL,
  name VARCHAR(80) NOT NULL,
  UNIQUE (id, type),    -- habilita las FK compuestas de las tablas puente
  UNIQUE (type, name)   -- evita duplicados dentro del mismo tipo
);

CREATE INDEX idx_catalog_type ON catalog(type);

-- Catálogo de tipos de documento requeridos, por tipo de entidad
CREATE TABLE document_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,   -- 'estatutos', 'certificado_delitos_sexuales', etc.
  name VARCHAR(120) NOT NULL,
  entity_type entity_type NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true
);

-- -------------------------------------------------------------------------
-- Perfiles por tipo de entidad
-- -------------------------------------------------------------------------
CREATE TABLE organization_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  organization_type_id INT,
  organization_type_kind catalog_type NOT NULL DEFAULT 'organization_type'
    CHECK (organization_type_kind = 'organization_type'),
  tax_id VARCHAR(30),                 -- CIF/NIF
  registry_number VARCHAR(50),
  founded_at DATE,
  country VARCHAR(60),
  province VARCHAR(60),
  city VARCHAR(60),
  address TEXT,
  website VARCHAR(200),
  social_links JSONB,                 -- {"instagram": "...", "facebook": "...", ...}
  mission TEXT,
  vision TEXT,
  scope TEXT,                         -- ámbito de actuación
  served_groups TEXT,                 -- colectivos atendidos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_type_id, organization_type_kind) REFERENCES catalog (id, type)
);

CREATE TRIGGER trg_organization_profiles_updated_at
  BEFORE UPDATE ON organization_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE legal_representatives (
  id SERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  position VARCHAR(80),               -- cargo
  phone VARCHAR(30),
  email VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE volunteer_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  volunteer_type volunteer_type NOT NULL,
  document_type VARCHAR(20),          -- cédula, pasaporte, etc.
  document_number VARCHAR(30),
  birth_date DATE,
  profession VARCHAR(100),
  languages TEXT[],
  availability_mode availability_mode,
  has_prior_experience BOOLEAN,       -- aplica principalmente a no profesional
  transport_available BOOLEAN,        -- medio de transporte propio
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_volunteer_profiles_updated_at
  BEFORE UPDATE ON volunteer_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------------------------
-- Tablas puente (many-to-many) contra el catálogo unificado
-- catalog_type queda fijo por tabla (CHECK) y forma, junto con catalog_id,
-- la FK compuesta hacia catalog(id, type): si alguien intenta enlazar un
-- catalog_id que en realidad es de otro tipo, Postgres rechaza el insert.
-- -------------------------------------------------------------------------
CREATE TABLE organization_disability_types (
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id INT NOT NULL,
  catalog_type catalog_type NOT NULL DEFAULT 'disability_type'
    CHECK (catalog_type = 'disability_type'),
  PRIMARY KEY (organization_id, catalog_id),
  FOREIGN KEY (catalog_id, catalog_type) REFERENCES catalog (id, type)
);

CREATE TABLE organization_services (
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id INT NOT NULL,
  catalog_type catalog_type NOT NULL DEFAULT 'service'
    CHECK (catalog_type = 'service'),
  PRIMARY KEY (organization_id, catalog_id),
  FOREIGN KEY (catalog_id, catalog_type) REFERENCES catalog (id, type)
);

CREATE TABLE volunteer_interest_areas (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id INT NOT NULL,
  catalog_type catalog_type NOT NULL DEFAULT 'interest_area'
    CHECK (catalog_type = 'interest_area'),
  PRIMARY KEY (user_id, catalog_id),
  FOREIGN KEY (catalog_id, catalog_type) REFERENCES catalog (id, type)
);

CREATE TABLE volunteer_experience (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id INT NOT NULL,
  catalog_type catalog_type NOT NULL DEFAULT 'experience_category'
    CHECK (catalog_type = 'experience_category'),
  PRIMARY KEY (user_id, catalog_id),
  FOREIGN KEY (catalog_id, catalog_type) REFERENCES catalog (id, type)
);

-- -------------------------------------------------------------------------
-- Verificación: solicitudes, documentos e historial
-- -------------------------------------------------------------------------

-- Una fila por usuario/organización: el reenvío tras rechazo transiciona
-- el mismo registro de 'rechazada' a 'entregada' en lugar de crear uno nuevo.
CREATE TABLE verification_requests (
  id SERIAL PRIMARY KEY,
  owner_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  status verification_status NOT NULL DEFAULT 'entregada',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE verification_documents (
  id SERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type_id INT NOT NULL REFERENCES document_types(id),
  storage_key TEXT NOT NULL,
  status document_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE verification_status_history (
  id SERIAL PRIMARY KEY,
  verification_request_id INT NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  from_status verification_status,
  to_status verification_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE verification_token_action AS ENUM (
  'iniciar_revision',
  'completar_registro'
);

CREATE TABLE verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_request_id INT NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE,
  action verification_token_action NOT NULL DEFAULT 'iniciar_revision',
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- Índices
-- -------------------------------------------------------------------------
CREATE INDEX idx_verification_requests_status ON verification_requests(status);
CREATE INDEX idx_verification_documents_owner ON verification_documents(owner_id);
CREATE INDEX idx_verification_documents_status ON verification_documents(status);
CREATE INDEX idx_verification_status_history_request ON verification_status_history(verification_request_id);
CREATE INDEX idx_legal_representatives_org ON legal_representatives(organization_id);
CREATE INDEX idx_document_types_entity_type ON document_types(entity_type);

-- =========================================================================
-- Datos semilla — Catálogo unificado
-- =========================================================================

-- organization_type (IDs 1-11)
INSERT INTO catalog (type, name) VALUES
  ('organization_type', 'Fundación'),
  ('organization_type', 'Asociación'),
  ('organization_type', 'ONG'),
  ('organization_type', 'Empresa'),
  ('organization_type', 'Administración pública'),
  ('organization_type', 'Centro educativo'),
  ('organization_type', 'Hospital'),
  ('organization_type', 'Centro especial de empleo'),
  ('organization_type', 'Centro ocupacional'),
  ('organization_type', 'Universidad'),
  ('organization_type', 'Otra');

-- disability_type (IDs 12-22)
INSERT INTO catalog (type, name) VALUES
  ('disability_type', 'Visual'),
  ('disability_type', 'Auditiva'),
  ('disability_type', 'Física'),
  ('disability_type', 'Intelectual'),
  ('disability_type', 'Psicosocial'),
  ('disability_type', 'TEA'),
  ('disability_type', 'Daño cerebral'),
  ('disability_type', 'Discapacidad orgánica/visceral'),
  ('disability_type', 'Enfermedades raras'),
  ('disability_type', 'Multidiscapacidad'),
  ('disability_type', 'Otras');

-- interest_area (IDs 23-35)
INSERT INTO catalog (type, name) VALUES
  ('interest_area', 'Acompañamiento'),
  ('interest_area', 'Accesibilidad'),
  ('interest_area', 'Tecnología'),
  ('interest_area', 'Apoyo emocional'),
  ('interest_area', 'Gestión administrativa'),
  ('interest_area', 'Comunicación'),
  ('interest_area', 'Traducción'),
  ('interest_area', 'Lengua de signos'),
  ('interest_area', 'Braille'),
  ('interest_area', 'Guía acompañante'),
  ('interest_area', 'Mentoría'),
  ('interest_area', 'Medio de transporte'),
  ('interest_area', 'Logística');

-- experience_category (IDs 36-42)
INSERT INTO catalog (type, name) VALUES
  ('experience_category', 'Voluntariado'),
  ('experience_category', 'Atención social'),
  ('experience_category', 'Discapacidad'),
  ('experience_category', 'Sanidad'),
  ('experience_category', 'Educación'),
  ('experience_category', 'Tecnología'),
  ('experience_category', 'Psicología');

-- service (IDs 43-50)
INSERT INTO catalog (type, name) VALUES
  ('service', 'Acompañamiento personal'),
  ('service', 'Transporte adaptado'),
  ('service', 'Terapias y rehabilitación'),
  ('service', 'Capacitación laboral'),
  ('service', 'Asesoría legal'),
  ('service', 'Apoyo psicológico'),
  ('service', 'Alojamiento temporal'),
  ('service', 'Comedor / alimentación');

-- =========================================================================
-- Datos semilla — Tipos de documento requeridos por tipo de entidad
-- =========================================================================

-- Organización
INSERT INTO document_types (code, name, entity_type, is_required) VALUES
  ('estatutos', 'Estatutos de la organización', 'organization', true),
  ('rif', 'Registro de Información Fiscal (RIF)', 'organization', true),
  ('acta_constitutiva', 'Acta constitutiva', 'organization', true),
  ('identificacion_representante', 'Identificación del representante legal', 'organization', true),
  ('certificado_bancario', 'Certificado bancario', 'organization', false),
  ('declaracion_impuestos', 'Declaración de impuestos del último ejercicio', 'organization', false),
  ('memoria_actividades', 'Memoria de actividades', 'organization', false);

-- Voluntario profesional
INSERT INTO document_types (code, name, entity_type, is_required) VALUES
  ('identificacion', 'Documento de identidad (cédula o pasaporte)', 'volunteer_professional', true),
  ('titulo_profesional', 'Título profesional o certificación', 'volunteer_professional', true),
  ('curriculum', 'Currículum vitae actualizado', 'volunteer_professional', false),
  ('certificado_antecedentes', 'Certificado de antecedentes penales', 'volunteer_professional', false);

-- Voluntario no profesional
INSERT INTO document_types (code, name, entity_type, is_required) VALUES
  ('identificacion', 'Documento de identidad (cédula o pasaporte)', 'volunteer_non_professional', true),
  ('carta_motivacion', 'Carta de motivación', 'volunteer_non_professional', false),
  ('certificado_antecedentes', 'Certificado de antecedentes penales', 'volunteer_non_professional', false);
