export const CLASSIN_COPILOT_QUESTION_IDS = Object.freeze([
  'A1', 'A2', 'A3', 'A4',
  'B1', 'B2', 'B3',
  'C1', 'C2', 'C5',
  'D1', 'D2', 'D5',
  'E1', 'E2', 'E3', 'E4', 'E5',
  'F1', 'F2', 'F3',
] as const);

export type ClassInCopilotQuestionId = typeof CLASSIN_COPILOT_QUESTION_IDS[number];

export const CLASSIN_COPILOT_TOOL_IDS = Object.freeze([
  'read_course_progress',
  'list_course_activities',
  'read_class_roster',
  'read_lesson_companions',
  'read_class_attendance',
  'read_recording_progress',
  'read_activity',
  'read_homework_students',
  'aggregate_question_results',
  'read_student_learning',
  'read_class_resources',
  'read_class_transcript',
  'read_ai_analysis',
  'read_material_content',
  'read_weekly_learning',
  'reuse_conversation_artifact',
  'read_im_history',
  'resolve_referenced_question',
  'read_reply_context',
] as const);

export type ClassInCopilotToolId = typeof CLASSIN_COPILOT_TOOL_IDS[number];
export type ClassInEvidenceLevel = 'BUSINESS_FACT' | 'DETERMINISTIC_DERIVATION' | 'AI_DERIVED';
export type ClassInCopilotFailureCode =
  | 'disabled'
  | 'unauthorized'
  | 'forbidden'
  | 'timeout'
  | 'schema_changed'
  | 'object_required'
  | 'object_mismatch'
  | 'partial_result'
  | 'upstream_error';

export type ClassInToolRouteReceipt = Readonly<{
  questionId: ClassInCopilotQuestionId;
  requestedToolIds: readonly ClassInCopilotToolId[];
  executedToolIds: readonly ClassInCopilotToolId[];
  actorRef: string;
  tenantRef: string;
  threadRef: string;
  objectRefs: readonly string[];
  contextVersion: string;
  capturedAt: string;
}>;

export type ClassInContextFailure = Readonly<{
  toolId: ClassInCopilotToolId;
  code: ClassInCopilotFailureCode;
  recoverable: boolean;
  message: string;
}>;

export type ClassInCopilotContextResult<T> = Readonly<{
  status: 'complete' | 'partial' | 'failed';
  data?: T;
  evidenceLevels: readonly ClassInEvidenceLevel[];
  routeReceipt: ClassInToolRouteReceipt;
  failures: readonly ClassInContextFailure[];
}>;
