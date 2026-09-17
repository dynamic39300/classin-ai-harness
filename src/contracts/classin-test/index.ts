export type ClassInActivityKind = 'classroom' | 'homework' | 'exam' | 'recording' | 'material';
export type ClassInActivity = Readonly<{
  id: string; bizId: string; unitId: string; categoryId: string; name: string;
  kind: ClassInActivityKind; startsAt: string | null; endsAt: string | null;
  published: boolean; cancelled?: boolean; process: number; summary: Readonly<Record<string, number>>;
}>;
export type ClassInMember = Readonly<{ id: string; name: string; identity: number }>;
export type ClassInScene = Readonly<{
  environment: 'classin-test'; teacher: Readonly<{ id: string; name: string }>;
  schoolRef: string; class: Readonly<{ id: string; name: string }>;
  course: Readonly<{ id: string; name: string }>;
  units: readonly Readonly<{ id: string; name: string; count: number }>[];
  activities: readonly ClassInActivity[]; members: readonly ClassInMember[];
  capturedAt: string; version: string; complete: true;
  capabilities: Readonly<{ ordinaryIm: 'unavailable'; realtimeAttendance: 'unverified' }>;
}>;
export type ClassInCourseProgress = Readonly<{
  className: string;
  courses: readonly Readonly<{ id: string; name: string; unitCount: number; activityCount: number; classCount: number; completedClassCount: number; lastCompleted: ClassInActivity | null; nextClass: ClassInActivity | null }>[];
  capturedAt: string;
  version: string;
}>;
export type ClassInQuestion = Readonly<{ id: string; typeCode: number; content: string; options: readonly string[]; answers: readonly string[]; analysis: string; hasImage: boolean; images?: readonly Readonly<{ ref: string; name: string }>[] }>;
export type ClassInSubmission = Readonly<{
  status: 'available' | 'unavailable'; message: string; text: string; teacherFeedback: string;
  attachments: readonly Readonly<{ kind: string; count: number }>[];
  images?: readonly Readonly<{ ref: string; name: string }>[];
}>;
export type ClassInExamAnswers = Readonly<{
  status: 'available' | 'unavailable'; message: string;
  questions: readonly Readonly<{ id: string; position: number; status: string; answers: readonly string[]; marking: string | null; score: number | null; hasMedia: boolean }>[];
}>;
export type ClassInResource = Readonly<{ bytes: Uint8Array; mimeType: string; name: string; sha256: string }>;
export type ClassInDocumentText = Readonly<{ status: 'available' | 'unavailable'; text: string; pages: number | null; message: string }>;
export type ClassInReplay = Readonly<{
  state: 'files_returned' | 'empty' | 'unavailable'; message: string;
  files: readonly Readonly<{ playbackRef?: string; statusCode: string; durationSeconds: number | null; startsAt: string | null; endsAt: string | null; createdAt: string | null }>[];
}>;
export type ClassInClassroomResult = Readonly<{
  status: 'available' | 'unavailable'; message: string; durationSeconds: number | null;
  attendance: Readonly<{ expected: number; actual: number; late: number }> | null;
  highlights: number | null; blackboards: number | null;
  notes: readonly Readonly<{ id: string; text: string; createdAt: string | null }>[]; notesMessage: string;
  aiAnalysis: 'available' | 'not_generated' | 'unavailable';
}>;
export type ClassInHistoricalAttendanceStudent = Readonly<{
  id: string; name: string; attended: boolean; late: boolean; earlyLeave: boolean; durationSeconds: number;
}>;
export type ClassInHistoricalAttendanceLesson = Readonly<{
  activity: ClassInActivity; expectedCount: number; attendedCount: number; lateCount: number; earlyLeaveCount: number;
  students: readonly ClassInHistoricalAttendanceStudent[];
}>;
export type ClassInHistoricalAttendance = Readonly<{
  status: 'available'; lessons: readonly ClassInHistoricalAttendanceLesson[]; capturedAt: string; version: string; limitation: string;
}>;
export type ClassInQuestionAggregate = Readonly<{
  activityId: string; activityName: string; activityEndsAt: string | null;
  topicId: string; position: number; content: string; hasImage: boolean;
  assignedCount: number; validCount: number; correctCount: number; wrongCount: number; partialCount: number;
  pendingCount: number; unansweredCount: number; nonParticipantCount: number;
}>;
export type ClassInQuestionAggregation = Readonly<{
  status: 'available'; capturedAt: string; version: string;
  window: Readonly<{ from: string | null; to: string }>;
  includedActivities: readonly Readonly<{ id: string; name: string; endsAt: string | null; questionCount: number; assignedCount: number }>[];
  excludedActivities: readonly Readonly<{ id: string; name: string; reason: string }>[];
  questions: readonly ClassInQuestionAggregate[];
  rule: string;
}>;
export type ClassInLearningRecordState = 'complete' | 'incomplete' | 'overdue' | 'future' | 'observed' | 'unknown';
export type ClassInLearningRecord = Readonly<{
  activity: ClassInActivity; state: ClassInLearningRecordState; status: string;
  grade: string | null; progress: number | null; durationSeconds: number | null;
}>;
export type ClassInStudentLearning = Readonly<{ id: string; name: string; records: readonly ClassInLearningRecord[] }>;
export type ClassInLearningSummary = Readonly<{
  status: 'available'; capturedAt: string; version: string;
  period: Readonly<{ from: string; to: string; timeZone: 'Asia/Shanghai'; label: string }>;
  students: readonly ClassInStudentLearning[];
  futureSchedule: readonly ClassInActivity[];
  coverage: Readonly<{ studentCount: number; activityCount: number; byKind: Readonly<Record<ClassInActivityKind, number>> }>;
  limitations: readonly string[];
}>;
export type ClassInResolvedHomeworkQuestion = Readonly<{
  activity: ClassInActivity; position: number; resourceId: string; resourceName: string;
  text: string; textSource: 'apple-vision-ocr'; capturedAt: string; version: string;
}>;
export type ClassInActivityDetail = Readonly<{
  activity: ClassInActivity; capturedAt: string; version: string;
  description: string; questions?: readonly ClassInQuestion[]; classroomResult?: ClassInClassroomResult; replay?: ClassInReplay; fields: readonly Readonly<{ label: string; value: string }>[];
  resources: readonly Readonly<{ id?: string; name: string; kind: string; state: string; document?: ClassInDocumentText }>[];
  students: readonly Readonly<{ id: string; name: string; status: string; grade: string | null; progress: number | null; durationSeconds: number | null; submission?: ClassInSubmission; examAnswers?: ClassInExamAnswers }>[];
}>;
export type ClassInErrorCode = 'disabled' | 'unauthorized' | 'forbidden' | 'timeout' | 'upstream_error' | 'incomplete' | 'schema_error' | 'unsupported';
export interface ClassInReadPort {
  scene(): Promise<ClassInScene>;
  detail(activityId: string): Promise<ClassInActivityDetail>;
  resource(activityId: string, resourceId: string): Promise<ClassInResource>;
  submissionResource(activityId: string, studentId: string, imageRef: string): Promise<ClassInResource>;
  questionResource(activityId: string, topicId: string, imageRef: string): Promise<ClassInResource>;
}

export * from './copilot-context';
