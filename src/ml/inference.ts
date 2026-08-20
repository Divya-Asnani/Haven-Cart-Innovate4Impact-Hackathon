import int8Model from '../../models/offline/risk_model_int8.json';

export type SafetyAssessmentInput = {
    safe_now: boolean;
    perpetrator_present: boolean;
    can_leave_safely: boolean;
    medical_help: boolean;
    contact_requested: boolean;
};

export type MLResult = {
    mlRiskLevel: "LOW" | "MEDIUM" | "HIGH";
    confidence: number;
    modelVersion: string;
    modelType: string;
    classProbabilities: Record<string, number>;
};

/**
 * Perform inference using the INT8 Multinomial Logistic Regression model.
 * Mathematical operation:
 * 1. Convert booleans to 1/0
 * 2. Standardize features: (x - mean) / scale
 * 3. Calculate linear score zInt = intercept + sum(coeff * scaled_x)
 * 4. Apply quantization scale: zFloat = zInt * quant_scale
 * 5. Calculate probabilities using Softmax: exp(z) / sum(exp(z))
 */
export const runMLInference = (input: SafetyAssessmentInput): MLResult => {
    // 1. Order features exactly as expected by the model
    const featureOrder = [
        "safe_now",
        "perpetrator_present",
        "can_leave_safely",
        "medical_help",
        "contact_requested"
    ];

    // Verify boolean encoding: true -> 1, false -> 0
    const x = featureOrder.map(key => (input[key as keyof SafetyAssessmentInput] ? 1 : 0));

    const scaler = int8Model.scaler;
    const classifier = int8Model.classifier;
    const classes = int8Model.classes;

    // 2. Standardize features
    const scaledX = x.map((val, i) => (val - scaler.mean[i]) / scaler.scale[i]);

    // 3 & 4. Calculate linear scores (zFloat)
    const zFloat = classes.map((_: string, c: number) => {
        let zInt = classifier.intercepts_int8[c];
        for (let i = 0; i < featureOrder.length; i++) {
            zInt += classifier.coefficients_int8[c][i] * scaledX[i];
        }
        return zInt * classifier.quantization.scale;
    });

    // 5. Calculate probabilities (Softmax)
    // Subtract maxZ for numerical stability before exp()
    const maxZ = Math.max(...zFloat);
    const expZ = zFloat.map((z: number) => Math.exp(z - maxZ));
    const sumExpZ = expZ.reduce((a: number, b: number) => a + b, 0);
    const probs = expZ.map((e: number) => e / sumExpZ);

    // 6. Find class with highest probability
    let maxProb = -1;
    let maxClassIdx = -1;
    for (let i = 0; i < probs.length; i++) {
        if (probs[i] > maxProb) {
            maxProb = probs[i];
            maxClassIdx = i;
        }
    }

    const predictedClass = classes[maxClassIdx] as "LOW" | "MEDIUM" | "HIGH";
    
    const classProbabilities: Record<string, number> = {};
    classes.forEach((cls: string, i: number) => {
        classProbabilities[cls] = probs[i];
    });

    return {
        mlRiskLevel: predictedClass,
        confidence: maxProb,
        modelVersion: int8Model.version,
        modelType: int8Model.model_type,
        classProbabilities
    };
};

// Simple deterministic local testing capability
export const testInference = () => {
    const cases = [
        {
            name: "CASE 1",
            input: { safe_now: true, perpetrator_present: false, can_leave_safely: true, medical_help: false, contact_requested: false },
            expected: "LOW"
        },
        {
            name: "CASE 2",
            input: { safe_now: false, perpetrator_present: true, can_leave_safely: false, medical_help: false, contact_requested: true },
            expected: "HIGH"
        },
        {
            name: "CASE 3",
            input: { safe_now: false, perpetrator_present: true, can_leave_safely: false, medical_help: true, contact_requested: true },
            expected: "HIGH"
        },
        {
            name: "CASE 4",
            input: { safe_now: true, perpetrator_present: false, can_leave_safely: true, medical_help: false, contact_requested: true },
            expected: "LOW"
        }
    ];

    cases.forEach(c => {
        const result = runMLInference(c.input);
        console.log(`[Test ${c.name}] Predicted: ${result.mlRiskLevel} (Expected: ${c.expected}), Confidence: ${result.confidence.toFixed(4)}`);
    });
};
