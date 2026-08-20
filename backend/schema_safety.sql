-- safety_assessments
CREATE TABLE safety_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'logistic_regression',
  risk_score NUMERIC(6,5) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  ml_risk_level TEXT NOT NULL CHECK (ml_risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  final_risk_level TEXT NOT NULL CHECK (final_risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  decision_source TEXT NOT NULL CHECK (decision_source IN ('ML', 'RULE_OVERRIDE')),
  override_reason TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (decision_source = 'ML' AND override_reason IS NULL) OR
    (decision_source = 'RULE_OVERRIDE' AND override_reason IS NOT NULL)
  ),
  CHECK (completed_at >= started_at)
);

CREATE INDEX idx_safety_assessments_user_id ON safety_assessments(user_id);
CREATE INDEX idx_safety_assessments_session_id ON safety_assessments(session_id);
CREATE INDEX idx_safety_assessments_created_at ON safety_assessments(created_at);
CREATE INDEX idx_safety_assessments_final_risk ON safety_assessments(final_risk_level);

-- safety_assessment_answers
CREATE TABLE safety_assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES safety_assessments(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL CHECK (question_key IN ('safe_now', 'perpetrator_present', 'can_leave_safely', 'medical_help', 'contact_requested')),
  answer_value BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, question_key)
);

CREATE INDEX idx_safety_assessment_answers_assessment_id ON safety_assessment_answers(assessment_id);

-- safety_cases
CREATE TABLE safety_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id UUID UNIQUE REFERENCES safety_assessments(id) ON DELETE SET NULL,
  case_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (case_status IN ('OPEN', 'ESCALATED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  location_accuracy_m NUMERIC(10,2) CHECK (location_accuracy_m >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_safety_cases_user_id ON safety_cases(user_id);
CREATE INDEX idx_safety_cases_assessment_id ON safety_cases(assessment_id);
CREATE INDEX idx_safety_cases_case_status ON safety_cases(case_status);
CREATE INDEX idx_safety_cases_created_at ON safety_cases(created_at);

-- Apply RLS
ALTER TABLE safety_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_cases ENABLE ROW LEVEL SECURITY;
