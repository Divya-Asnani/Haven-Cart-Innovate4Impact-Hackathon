ALTER TABLE safety_cases
  ADD COLUMN IF NOT EXISTS medical_required BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill historical cases from their saved interview answer.
UPDATE safety_cases c
SET medical_required = TRUE
FROM safety_assessment_answers a
WHERE a.assessment_id = c.assessment_id
  AND a.question_key = 'medical_help'
  AND a.answer_value = TRUE;

CREATE INDEX IF NOT EXISTS idx_safety_cases_medical_required
  ON safety_cases (medical_required);
