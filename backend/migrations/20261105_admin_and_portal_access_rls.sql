-- Migration: 20261105_admin_and_portal_access_rls.sql
-- Description: Enforce backend and Supabase RLS security policies for Super Admin, NGO, and Medical roles.
-- Ensures strict scoping between auth.users, profiles, user_roles, and organization memberships.

-- 1. Ensure ADMIN, NGO, MEDICAL roles exist in roles table
INSERT INTO roles (role_code, role_name, description, is_active)
VALUES
  ('ADMIN', 'Super Administrator', 'Global administrative access to all organizations, accounts, and cases', TRUE),
  ('NGO', 'NGO Responder', 'Scoped access to NGO portal and emergency casework', TRUE),
  ('MEDICAL', 'Medical Responder', 'Scoped access to Medical portal for cases requiring medical attention', TRUE)
ON CONFLICT (role_code) DO UPDATE
SET is_active = TRUE,
    role_name = EXCLUDED.role_name,
    description = EXCLUDED.description;

-- 2. Enable Row Level Security (RLS) on key management and authorization tables
ALTER TABLE IF EXISTS support_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS responder_service_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS safety_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evidence_access_grants ENABLE ROW LEVEL SECURITY;

-- 3. Helper Functions for Role Resolution in Postgres (Security Definer)
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE (role_code TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT r.role_code
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = TRUE
    AND r.is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND r.role_code = 'ADMIN'
  );
$$;

-- 4. RLS Policies on support_services
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public support services read' AND tablename = 'support_services') THEN
    CREATE POLICY "Public support services read" ON support_services
      FOR SELECT USING (is_active = TRUE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin full support services access' AND tablename = 'support_services') THEN
    CREATE POLICY "Admin full support services access" ON support_services
      FOR ALL USING (is_super_admin(auth.uid()) OR auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- 5. RLS Policies on responder_service_memberships
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members view own memberships' AND tablename = 'responder_service_memberships') THEN
    CREATE POLICY "Members view own memberships" ON responder_service_memberships
      FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()) OR auth.jwt() ->> 'role' = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin manage memberships' AND tablename = 'responder_service_memberships') THEN
    CREATE POLICY "Admin manage memberships" ON responder_service_memberships
      FOR ALL USING (is_super_admin(auth.uid()) OR auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- 6. RLS Policies on safety_cases
-- NGO accounts access all active safety cases.
-- Medical accounts access safety cases where medical_required = TRUE.
-- Super Admin has global management access.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'NGO and Medical scoped case access' AND tablename = 'safety_cases') THEN
    CREATE POLICY "NGO and Medical scoped case access" ON safety_cases
      FOR SELECT USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR is_super_admin(auth.uid())
        OR ('NGO' IN (SELECT role_code FROM get_user_roles(auth.uid())))
        OR ('MEDICAL' IN (SELECT role_code FROM get_user_roles(auth.uid())) AND medical_required = TRUE)
      );
  END IF;
END $$;

