import type { LearningContextSelection } from './business-context';
import type { WorkBuddyImTarget } from './im-conversation-run';

export type TeachingStageId = 'before' | 'during' | 'after' | 'summary';

export type TeachingDynamicKind =
  | 'attention'
  | 'progress'
  | 'confirmation'
  | 'teacher-task'
  | 'unknown';

export type TeachingDynamicAction = Readonly<{
  label: string;
  teacherRequest: string;
  learningSelection?: LearningContextSelection;
}>;

export type TeachingDynamicItem = Readonly<{
  id: string;
  stage: TeachingStageId;
  kind: TeachingDynamicKind;
  /** Teacher-facing ClassIn scope such as class, course, lesson, assignment, or destination. */
  contextLabel?: string;
  title: string;
  detail: string;
  priority: number;
  courseRef?: string;
  objectRef?: string;
  action?: TeachingDynamicAction;
}>;

export type TeachingDynamicStage = Readonly<{
  id: TeachingStageId;
  items: readonly TeachingDynamicItem[];
}>;

export type TeachingDynamicsSnapshot = Readonly<{
  threadRef: string;
  currentStage: TeachingStageId;
  stages: readonly TeachingDynamicStage[];
  capturedAt: string;
  version: string;
  sourceRefs: readonly string[];
  truthLabel: 'fixed-demo' | 'read-only-business-data';
}>;

export type TeachingDynamicsRequest = Readonly<{
  actorRef: string;
  tenantRef: string;
  target: WorkBuddyImTarget;
}>;

/** ClassIn teaching facts are projected through this seam before they reach React. */
export interface TeachingDynamicsAdapter {
  list(request: TeachingDynamicsRequest): Promise<TeachingDynamicsSnapshot>;
}
