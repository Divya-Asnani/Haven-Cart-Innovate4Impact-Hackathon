-- Every completed safety assessment must produce an authorized case.
-- medical_required remains the portal boundary: NGO sees false, Medical sees true.
ALTER TABLE safety_cases
  ADD COLUMN IF NOT EXISTS medical_required BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO safety_cases (user_id, assessment_id, case_status, risk_level, medical_required)
SELECT a.user_id, a.id, 'OPEN', a.final_risk_level, COALESCE(ans.answer_value, FALSE)
FROM safety_assessments a
LEFT JOIN safety_assessment_answers ans
  ON ans.assessment_id = a.id AND ans.question_key = 'medical_help'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_cases c WHERE c.assessment_id = a.id
);

CREATE OR REPLACE FUNCTION insert_safety_assessment(
  p_assessment_id UUID,
  p_user_id UUID,
  p_session_id UUID,
  p_answers JSONB,
  p_ml_risk_level TEXT,
  p_ml_confidence NUMERIC,
  p_final_risk_level TEXT,
  p_decision_source TEXT,
  p_override_reason TEXT,
  p_model_version TEXT,
  p_started_at TIMESTAMPTZ,
  p_completed_at TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  v_existing_assessment UUID;
  v_existing_case UUID;
  v_new_case_id UUID;
  v_question_key TEXT;
  v_answer_value BOOLEAN;
  v_valid_keys TEXT[] := ARRAY['safe_now', 'perpetrator_present', 'can_leave_safely', 'medical_help', 'contact_requested'];
BEGIN
  SELECT id INTO v_existing_assessment FROM safety_assessments WHERE id = p_assessment_id;
  IF FOUND THEN
    SELECT id INTO v_existing_case FROM safety_cases WHERE assessment_id = p_assessment_id;
    RETURN jsonb_build_object('status', 'success', 'assessment_id', v_existing_assessment,
      'case_created', (v_existing_case IS NOT NULL), 'case_id', v_existing_case);
  END IF;

  IF p_ml_confidence < 0 OR p_ml_confidence > 1 THEN
    RAISE EXCEPTION 'Confidence must be between 0 and 1';
  END IF;
  IF p_ml_risk_level NOT IN ('LOW', 'MEDIUM', 'HIGH') OR p_final_risk_level NOT IN ('LOW', 'MEDIUM', 'HIGH') THEN
    RAISE EXCEPTION 'Invalid risk level';
  END IF;
  IF p_decision_source NOT IN ('ML', 'RULE_OVERRIDE') THEN
    RAISE EXCEPTION 'Invalid decision source';
  END IF;
  FOREACH v_question_key IN ARRAY v_valid_keys LOOP
    IF NOT (p_answers ? v_question_key) THEN
      RAISE EXCEPTION 'Missing required answer key: %', v_question_key;
    END IF;
  END LOOP;

  INSERT INTO safety_assessments (
    id, user_id, session_id, model_version, risk_score, ml_risk_level, final_risk_level,
    decision_source, override_reason, started_at, completed_at
  ) VALUES (
    p_assessment_id, p_user_id, p_session_id, p_model_version, p_ml_confidence, p_ml_risk_level,
    p_final_risk_level, p_decision_source, p_override_reason, p_started_at, p_completed_at
  );

  FOR v_question_key, v_answer_value IN SELECT key, value::boolean FROM jsonb_each_text(p_answers) LOOP
    IF v_question_key = ANY(v_valid_keys) THEN
      INSERT INTO safety_assessment_answers (assessment_id, question_key, answer_value)
      VALUES (p_assessment_id, v_question_key, v_answer_value);
    ELSE
      RAISE EXCEPTION 'Invalid question key: %', v_question_key;
    END IF;
  END LOOP;

  INSERT INTO safety_cases (user_id, assessment_id, case_status, risk_level, medical_required)
  VALUES (p_user_id, p_assessment_id, 'OPEN', p_final_risk_level,
    COALESCE((p_answers->>'medical_help')::boolean, FALSE))
  RETURNING id INTO v_new_case_id;

  RETURN jsonb_build_object('status', 'success', 'assessment_id', p_assessment_id,
    'case_created', TRUE, 'case_id', v_new_case_id);
END;
$$ LANGUAGE plpgsql;