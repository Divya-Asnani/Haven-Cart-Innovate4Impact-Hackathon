-- backend/schema_responder_security.sql

-- 1. responder_public_keys
CREATE TABLE IF NOT EXISTS responder_public_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  key_algorithm TEXT NOT NULL DEFAULT 'RSA-OAEP',
  key_size INT NOT NULL DEFAULT 2048,
  key_version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responder_public_keys_user_id ON responder_public_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_responder_public_keys_active ON responder_public_keys(user_id) WHERE is_active = TRUE;

-- 2. evidence_access_grants
CREATE TABLE IF NOT EXISTS evidence_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
  responder_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  responder_public_key_id UUID NOT NULL REFERENCES responder_public_keys(id) ON DELETE RESTRICT,
  wrapped_evidence_key TEXT NOT NULL,
  wrapping_algorithm TEXT NOT NULL DEFAULT 'RSA-OAEP',
  key_encryption_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_access_grants_unique_active 
ON evidence_access_grants(evidence_id, responder_user_id) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_evidence_access_grants_evidence_id ON evidence_access_grants(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_access_grants_responder ON evidence_access_grants(responder_user_id);

-- Apply RLS
ALTER TABLE responder_public_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_access_grants ENABLE ROW LEVEL SECURITY;

-- Assuming backend operates with service-role, but to be thorough:
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public responder keys read') THEN
        CREATE POLICY "Public responder keys read" ON responder_public_keys FOR SELECT USING (true);
    END IF;
END $$;
