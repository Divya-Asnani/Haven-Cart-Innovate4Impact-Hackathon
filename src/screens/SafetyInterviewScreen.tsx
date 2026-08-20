import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { runMLInference } from '../ml/inference';
import { runRuleEngine } from '../ml/ruleEngine';
import { enqueueAssessment, syncOfflineAssessments } from '../storage/assessmentQueue';

const QUESTIONS = [
  { id: 'safe_now', text: 'Are you safe right now?' },
  { id: 'perpetrator_present', text: 'Is the person who may harm you nearby?' },
  { id: 'can_leave_safely', text: 'Can you leave safely if needed?' },
  { id: 'medical_help', text: 'Do you need medical help?' },
  { id: 'contact_requested', text: 'Do you want to contact someone?' },
];

export const SafetyInterviewScreen = ({ navigation }: { navigation: any }) => {
  const { triggerTouchActivity, setCurrentRiskAssessment } = useApp();
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const startedAt = useRef(new Date().toISOString());

  const handleAnswer = (questionId: string, value: boolean) => {
    triggerTouchActivity();
    setAnswers((prev: any) => ({ ...prev, [questionId]: value }));
  };

  const handleComplete = async () => {
    triggerTouchActivity();
    if (Object.keys(answers).length < QUESTIONS.length) {
      Alert.alert('Incomplete', 'Please answer all questions before proceeding.');
      return;
    }

    try {
      const assessmentResult = {
        safe_now: answers['safe_now'],
        perpetrator_present: answers['perpetrator_present'],
        can_leave_safely: answers['can_leave_safely'],
        medical_help: answers['medical_help'],
        contact_requested: answers['contact_requested'],
      };

      // Phase 2: Local INT8 Inference
      const mlResult = runMLInference(assessmentResult);

      // Phase 3: Rule Engine Override
      const finalResult = runRuleEngine(assessmentResult, mlResult);

      // Phase 5: Persist locally
      await enqueueAssessment(assessmentResult, mlResult, finalResult, startedAt.current);
      
      // Trigger non-blocking sync
      syncOfflineAssessments();

      // Phase 4: Store in AppContext
      setCurrentRiskAssessment({
        riskLevel: finalResult.finalRiskLevel,
        mlConfidence: finalResult.mlConfidence,
        decisionSource: finalResult.decisionSource,
        overrideReason: finalResult.overrideReason,
        modelVersion: finalResult.modelVersion,
        assessedAt: new Date().toISOString()
      });

      navigation.goBack();
    } catch (error) {
      console.error('[SafetyInterview] Assessment Engine Error:', error);
      Alert.alert(
        'Engine Error',
        'We encountered an issue calculating the safety assessment safely. The data could not be saved.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  return (
    <TouchableWithoutFeedback onPress={triggerTouchActivity}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <TouchableOpacity onPress={() => { triggerTouchActivity(); navigation.goBack(); }}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.text, marginLeft: 16 }}>
            Quick Assessment
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 20 }}>
            Please answer these questions so we can determine the best way to help you right now. Your answers are completely private.
          </Text>

          {QUESTIONS.map((q, index) => {
            const hasAnswer = answers[q.id] !== undefined;
            const isYes = answers[q.id] === true;
            const isNo = answers[q.id] === false;

            return (
              <View key={q.id} style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>
                  {index + 1}. {q.text}
                </Text>
                
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleAnswer(q.id, true)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isYes ? COLORS.primary : COLORS.border,
                      backgroundColor: isYes ? COLORS.primaryLight : COLORS.background,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {isYes ? (
                      <CheckCircle2 size={18} color={COLORS.primary} />
                    ) : (
                      <Circle size={18} color={COLORS.textMuted} />
                    )}
                    <Text style={{ fontSize: 14, fontWeight: isYes ? '800' : '600', color: isYes ? COLORS.primary : COLORS.text }}>
                      Yes
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleAnswer(q.id, false)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isNo ? COLORS.primary : COLORS.border,
                      backgroundColor: isNo ? COLORS.primaryLight : COLORS.background,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {isNo ? (
                      <CheckCircle2 size={18} color={COLORS.primary} />
                    ) : (
                      <Circle size={18} color={COLORS.textMuted} />
                    )}
                    <Text style={{ fontSize: 14, fontWeight: isNo ? '800' : '600', color: isNo ? COLORS.primary : COLORS.text }}>
                      No
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleComplete}
            style={{
              backgroundColor: Object.keys(answers).length === QUESTIONS.length ? COLORS.primary : COLORS.border,
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              marginTop: 16,
              marginBottom: 40,
            }}
          >
            <Text style={{ color: Object.keys(answers).length === QUESTIONS.length ? '#FFF' : COLORS.textMuted, fontWeight: '800', fontSize: 16 }}>
              Submit Assessment
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};
