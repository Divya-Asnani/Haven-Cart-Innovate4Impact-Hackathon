import { SafetyAssessmentInput, MLResult } from './inference';
import ruleEngineSpec from '../../models/risk_rule_engine.json';

export type FinalRiskResult = {
    mlRiskLevel: "LOW" | "MEDIUM" | "HIGH";
    mlConfidence: number;
    finalRiskLevel: "LOW" | "MEDIUM" | "HIGH";
    decisionSource: "ML" | "RULE_OVERRIDE";
    overrideReason: string | null;
    modelVersion: string;
};

/**
 * Executes the validated deterministic rule engine over the ML prediction.
 * Falls back to the ML prediction if no rule triggers.
 */
export const runRuleEngine = (input: SafetyAssessmentInput, mlResult: MLResult): FinalRiskResult => {
    // Convert boolean inputs to 1/0 for rule evaluation
    const safe_now = input.safe_now ? 1 : 0;
    const perpetrator_present = input.perpetrator_present ? 1 : 0;
    const can_leave_safely = input.can_leave_safely ? 1 : 0;
    const medical_help = input.medical_help ? 1 : 0;
    
    // The LETHAL_WEAPON rule requires a "lethal_weapon" variable which is NOT 
    // collected by the current 5-question app-facing feature set.
    // We cannot evaluate it. We evaluate only rules whose data we have.

    // 1. CRITICAL_CURRENT_DANGER
    // condition: "safe_now == 0 AND perpetrator_present == 1 AND can_leave_safely == 0"
    if (safe_now === 0 && perpetrator_present === 1 && can_leave_safely === 0) {
        return {
            mlRiskLevel: mlResult.mlRiskLevel,
            mlConfidence: mlResult.confidence,
            finalRiskLevel: "HIGH",
            decisionSource: "RULE_OVERRIDE",
            overrideReason: "CRITICAL_CURRENT_DANGER",
            modelVersion: mlResult.modelVersion
        };
    }

    // 2. MEDICAL_DANGER
    // condition: "safe_now == 0 AND perpetrator_present == 1 AND medical_help == 1"
    if (safe_now === 0 && perpetrator_present === 1 && medical_help === 1) {
        return {
            mlRiskLevel: mlResult.mlRiskLevel,
            mlConfidence: mlResult.confidence,
            finalRiskLevel: "HIGH",
            decisionSource: "RULE_OVERRIDE",
            overrideReason: "MEDICAL_DANGER",
            modelVersion: mlResult.modelVersion
        };
    }

    // 3. LETHAL_WEAPON cannot be triggered because `lethal_weapon` is not collected.

    // No override triggered -> Return ML decision
    return {
        mlRiskLevel: mlResult.mlRiskLevel,
        mlConfidence: mlResult.confidence,
        finalRiskLevel: mlResult.mlRiskLevel,
        decisionSource: "ML",
        overrideReason: null,
        modelVersion: mlResult.modelVersion
    };
};

// Local test suite for the rule engine
export const testRuleEngine = () => {
    const mockML: MLResult = {
        mlRiskLevel: "LOW",
        confidence: 0.9,
        modelVersion: "1.0",
        modelType: "multinomial_logistic_regression_int8",
        classProbabilities: { LOW: 0.9, MEDIUM: 0.05, HIGH: 0.05 }
    };

    // TEST 1 - Safe case
    const safeCase = runRuleEngine(
        { safe_now: true, perpetrator_present: false, can_leave_safely: true, medical_help: false, contact_requested: false },
        mockML
    );
    console.log('[Test 1] Safe case ->', safeCase.decisionSource, safeCase.finalRiskLevel);

    // TEST 2 - Critical current danger
    const criticalDanger = runRuleEngine(
        { safe_now: false, perpetrator_present: true, can_leave_safely: false, medical_help: false, contact_requested: false },
        mockML
    );
    console.log('[Test 2] CRITICAL_CURRENT_DANGER ->', criticalDanger.overrideReason);

    // TEST 3 - Medical danger
    const medicalDanger = runRuleEngine(
        { safe_now: false, perpetrator_present: true, can_leave_safely: true, medical_help: true, contact_requested: false },
        mockML
    );
    console.log('[Test 3] MEDICAL_DANGER ->', medicalDanger.overrideReason);

    // TEST 5 - Multiple rules (Both Critical and Medical apply)
    const multipleRules = runRuleEngine(
        { safe_now: false, perpetrator_present: true, can_leave_safely: false, medical_help: true, contact_requested: false },
        mockML
    );
    console.log('[Test 5] Multiple rules (Priority) ->', multipleRules.overrideReason);

    // TEST 6 - No override
    const noOverride = runRuleEngine(
        { safe_now: false, perpetrator_present: true, can_leave_safely: true, medical_help: false, contact_requested: false },
        mockML
    );
    console.log('[Test 6] No override ->', noOverride.decisionSource);
};
