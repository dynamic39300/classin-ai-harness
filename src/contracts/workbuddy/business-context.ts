import type { AgentRuntimeAdapter, RuntimeScope } from './agent-runtime';
import type { WorkBuddyImTarget } from './im-conversation-run';
import type { TeachingDynamicsAdapter } from './teaching-dynamics';

export type BusinessContextSourceKind = 'fixed-demo' | 'dw-hunter' | 'classin-api';
export type BusinessContextUse = 'private-assistance' | 'message-draft';
export type LearningCapability = 'personalized-reminder' | 'class-recap' | 'wrong-question-practice' | 'learning-summary';

export type LearningContextOption = Readonly<{
  ref: string;
  label: string;
  description: string;
  directThreadRef?: string;
  studentRefs?: readonly string[];
  reminderReasonRefs?: readonly string[];
  isAggregate?: boolean;
}>;

export type LearningContextCatalog = Readonly<{
  students: readonly LearningContextOption[];
  lessons: readonly LearningContextOption[];
  assignments: readonly LearningContextOption[];
  wrongQuestions: readonly LearningContextOption[];
  periods: readonly LearningContextOption[];
  reminderReasons: readonly LearningContextOption[];
  lockedStudentRef?: string;
  version: string;
  truthLabel: 'fixed-demo' | 'read-only-business-data';
}>;

export type LearningContextSelection = Readonly<{
  capability: LearningCapability;
  studentRef: string;
  lessonRef?: string;
  assignmentRef?: string;
  wrongQuestionRef?: string;
  periodRef?: string;
  reminderReasonRef?: string;
}>;

export type BusinessContextSource = Readonly<{
  kind: BusinessContextSourceKind;
  owner: 'ClassIn';
  sourceRef: string;
  permissionScope: string;
  capturedAt: string;
  freshness: 'current' | 'stale' | 'unknown';
  version: string;
}>;

export type BusinessContextItem = Readonly<{
  key: string;
  label: string;
  value: string;
  sourceRef: string;
  sensitivity: 'standard' | 'student-personal';
}>;

export type BusinessContextSnapshot = Readonly<{
  id: string;
  version: string;
  actorRef: string;
  tenantRef: string;
  threadRef: string;
  channel: 'class' | 'direct';
  use: BusinessContextUse;
  sources: readonly BusinessContextSource[];
  items: readonly BusinessContextItem[];
  recentMessages: readonly Readonly<{
    authorRole: 'teacher' | 'student-family' | 'class-agent';
    authorName: string;
    body: string;
  }>[];
  excludedSensitiveCount: number;
  truthLabel: 'fixed-demo' | 'read-only-business-data';
}>;

export type BusinessContextRequest = Readonly<{
  actorRef: string;
  tenantRef: string;
  target: WorkBuddyImTarget;
  use: BusinessContextUse;
}>;

export interface BusinessContextAdapter {
  capture(request: BusinessContextRequest): Promise<BusinessContextSnapshot>;
  listLearningContext(request: Omit<BusinessContextRequest, 'use'>): Promise<LearningContextCatalog>;
  captureLearningContext(request: BusinessContextRequest & Readonly<{ selection: LearningContextSelection }>): Promise<BusinessContextSnapshot>;
}

export type MessageDraftArtifact = Readonly<{
  id: string;
  sessionRef: string;
  contextSnapshotRef: string;
  threadRef: string;
  channel: 'class' | 'direct';
  body: string;
  version: number;
}>;

export type PersonalizedLearningArtifact = Readonly<{
  id: string;
  sessionRef: string;
  contextSnapshotRef: string;
  capability: LearningCapability;
  recipientRefs: readonly string[];
  recipientLabel: string;
  title: string;
  body: string;
  evidenceLabels: readonly string[];
  delivery: 'class-review' | 'direct-composer';
  targetThreadRef?: string;
  version: number;
}>;

export type SendMessageAction = Readonly<{
  id: string;
  kind: 'send-class-message';
  artifactRef: Readonly<{ id: string; version: number }>;
  contextSnapshotRef: string;
  threadRef: string;
  actorRef: string;
  actorName: string;
  body: string;
}>;

export type SendMessageApproval = Readonly<{
  id: string;
  actionRef: string;
  artifactRef: Readonly<{ id: string; version: number }>;
  approvedBy: string;
  approvedAt: string;
}>;

export type SendMessageReceipt = Readonly<{
  id: string;
  actionRef: string;
  approvalRef: string;
  status: 'success' | 'permission_denied' | 'stale_context' | 'recoverable_failure';
  result: string;
  executedAt: string;
  messageId?: string;
}>;

export interface ClassInMessageDraftAdapter {
  execute(action: SendMessageAction, approval: SendMessageApproval): Promise<SendMessageReceipt>;
}

export type ImSidecarAgentServices = Readonly<{
  runtime: AgentRuntimeAdapter;
  businessContext: BusinessContextAdapter;
  teachingDynamics: TeachingDynamicsAdapter;
  messageDraft: ClassInMessageDraftAdapter;
  actor: Readonly<{ id: string; name: string }>;
  tenantRef: string;
  scope: Extract<RuntimeScope, 'ideal-full'>;
}>;
