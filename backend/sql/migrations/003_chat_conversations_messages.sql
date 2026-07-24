-- =============================================================================
-- Chat module — conversations + messages
-- =============================================================================
-- conversations: hilo de mensajes asociado a una emergencia O a un help_request
-- (exactamente uno de los dos), atendido por un usuario registrado.
-- messages: mensajes individuales dentro de una conversación. sender_user_id
-- puede ser NULL para representar al ciudadano/solicitante anónimo.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID REFERENCES emergencies(id) ON DELETE CASCADE,
  help_request_id UUID REFERENCES help_requests(id) ON DELETE CASCADE,
  attended_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Exactamente uno de emergency_id / help_request_id debe ser no nulo.
  CONSTRAINT conversations_exactly_one_target_chk CHECK (
    (emergency_id IS NOT NULL AND help_request_id IS NULL) OR
    (emergency_id IS NULL AND help_request_id IS NOT NULL)
  ),

  -- Un mismo attended_by no puede tener dos conversaciones sobre el mismo target.
  CONSTRAINT conversations_emergency_attended_unique UNIQUE (emergency_id, attended_by),
  CONSTRAINT conversations_help_request_attended_unique UNIQUE (help_request_id, attended_by),

  CONSTRAINT conversations_status_chk CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS conversations_attended_by_idx ON conversations (attended_by);
CREATE INDEX IF NOT EXISTS conversations_emergency_id_idx ON conversations (emergency_id);
CREATE INDEX IF NOT EXISTS conversations_help_request_id_idx ON conversations (help_request_id);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,

  CONSTRAINT messages_body_not_blank_chk CHECK (length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_created_idx
  ON messages (conversation_id, created_at ASC);

-- ---------------------------------------------------------------------------
-- emergencies: columna para capability link del ciudadano anónimo
-- ---------------------------------------------------------------------------
ALTER TABLE emergencies
  ADD COLUMN IF NOT EXISTS access_token_hash TEXT;

-- Índice para lookup rápido por hash (cuando validamos el token del ciudadano).
CREATE INDEX IF NOT EXISTS emergencies_access_token_hash_idx
  ON emergencies (access_token_hash)
  WHERE access_token_hash IS NOT NULL;
