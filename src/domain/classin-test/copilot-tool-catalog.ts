import {
  CLASSIN_COPILOT_TOOL_IDS,
  type ClassInCopilotQuestionId,
  type ClassInCopilotToolId,
  type ClassInEvidenceLevel,
} from '@contracts/classin-test';

export type ClassInCopilotMilestone = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

export type ClassInCopilotToolDefinition = Readonly<{
  id: ClassInCopilotToolId;
  questionIds: readonly ClassInCopilotQuestionId[];
  milestone: ClassInCopilotMilestone;
  evidenceLevel: ClassInEvidenceLevel;
  owner: 'ClassIn' | 'TeachBuddy';
}>;

export const CLASSIN_COPILOT_TOOL_CATALOG: readonly ClassInCopilotToolDefinition[] = Object.freeze([
  { id: 'read_course_progress', questionIds: ['A1'], milestone: 'M1', evidenceLevel: 'DETERMINISTIC_DERIVATION', owner: 'ClassIn' },
  { id: 'list_course_activities', questionIds: ['A2'], milestone: 'M1', evidenceLevel: 'DETERMINISTIC_DERIVATION', owner: 'ClassIn' },
  { id: 'read_class_roster', questionIds: ['A3'], milestone: 'M1', evidenceLevel: 'BUSINESS_FACT', owner: 'ClassIn' },
  { id: 'read_lesson_companions', questionIds: ['A4'], milestone: 'M1', evidenceLevel: 'DETERMINISTIC_DERIVATION', owner: 'ClassIn' },
  { id: 'read_class_attendance', questionIds: ['B1', 'B2'], milestone: 'M2', evidenceLevel: 'DETERMINISTIC_DERIVATION', owner: 'ClassIn' },
  { id: 'read_recording_progress', questionIds: ['B3'], milestone: 'M2', evidenceLevel: 'BUSINESS_FACT', owner: 'ClassIn' },
  { id: 'read_activity', questionIds: ['C1'], milestone: 'M1', evidenceLevel: 'BUSINESS_FACT', owner: 'ClassIn' },
  { id: 'read_homework_students', questionIds: ['C2'], milestone: 'M1', evidenceLevel: 'DETERMINISTIC_DERIVATION', owner: 'ClassIn' },
  { id: 'aggregate_question_results', questionIds: ['C5'], milestone: 'M3', evidenceLevel: 'DETERMINISTIC_DERIVATION', owner: 'TeachBuddy' },
  { id: 'read_student_learning', questionIds: ['D1', 'D2', 'D5'], milestone: 'M4', evidenceLevel: 'DETERMINISTIC_DERIVATION', owner: 'TeachBuddy' },
  { id: 'read_class_resources', questionIds: ['E1'], milestone: 'M1', evidenceLevel: 'BUSINESS_FACT', owner: 'ClassIn' },
  { id: 'read_class_transcript', questionIds: ['E2'], milestone: 'M1', evidenceLevel: 'BUSINESS_FACT', owner: 'ClassIn' },
  { id: 'read_ai_analysis', questionIds: ['E2'], milestone: 'M1', evidenceLevel: 'AI_DERIVED', owner: 'ClassIn' },
  { id: 'read_material_content', questionIds: ['E3'], milestone: 'M3', evidenceLevel: 'BUSINESS_FACT', owner: 'ClassIn' },
  { id: 'read_weekly_learning', questionIds: ['E4'], milestone: 'M4', evidenceLevel: 'DETERMINISTIC_DERIVATION', owner: 'TeachBuddy' },
  { id: 'reuse_conversation_artifact', questionIds: ['E5'], milestone: 'M3', evidenceLevel: 'BUSINESS_FACT', owner: 'TeachBuddy' },
  { id: 'read_im_history', questionIds: ['F1', 'F2', 'F3'], milestone: 'M5', evidenceLevel: 'BUSINESS_FACT', owner: 'ClassIn' },
  { id: 'resolve_referenced_question', questionIds: ['F2'], milestone: 'M5', evidenceLevel: 'DETERMINISTIC_DERIVATION', owner: 'TeachBuddy' },
  { id: 'read_reply_context', questionIds: ['F3'], milestone: 'M5', evidenceLevel: 'BUSINESS_FACT', owner: 'ClassIn' },
]);

export function readClassInCopilotTool(id: ClassInCopilotToolId) {
  const definition = CLASSIN_COPILOT_TOOL_CATALOG.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`未注册的 ClassIn Copilot 工具：${id}`);
  return definition;
}

export function validateClassInCopilotToolCatalog() {
  const ids = new Set(CLASSIN_COPILOT_TOOL_CATALOG.map(({ id }) => id));
  return CLASSIN_COPILOT_TOOL_IDS.every((id) => ids.has(id)) && ids.size === CLASSIN_COPILOT_TOOL_IDS.length;
}
