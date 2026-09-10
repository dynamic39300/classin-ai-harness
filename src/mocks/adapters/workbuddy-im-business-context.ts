import type { BusinessContextAdapter, BusinessContextRequest, BusinessContextSnapshot } from '@contracts/workbuddy/business-context';
import { validateLearningSelectionAgainstCatalog } from '@domain/workbuddy/personalized-learning-service';
import { DW_DERIVED_IM_LEARNING_CATALOG, learningEvidence, WORKBUDDY_IM_LEARNING_CATALOG } from '@mocks/scenarios/workbuddy-im-learning-evidence';
import { loadPrivateImDemoContext } from './private-im-demo-context';

const DW_DERIVED_CLASS_ID = 'dw-expression-lab';
const DW_DERIVED_DIRECT_THREAD_ID = 'direct-dw-lin';

function learningCatalogFor(request: Omit<BusinessContextRequest, 'use'>) {
  return request.target.classId === DW_DERIVED_CLASS_ID || request.target.threadId === DW_DERIVED_DIRECT_THREAD_ID
    ? DW_DERIVED_IM_LEARNING_CATALOG
    : WORKBUDDY_IM_LEARNING_CATALOG;
}

function isDwDerivedTarget(request: Pick<BusinessContextRequest, 'target'>) {
  return request.target.classId === DW_DERIVED_CLASS_ID || request.target.threadId === DW_DERIVED_DIRECT_THREAD_ID;
}

function stableVersion(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `v-${(hash >>> 0).toString(16)}`;
}

export class FixedWorkBuddyImBusinessContextAdapter implements BusinessContextAdapter {
  constructor(private readonly now: () => Date) {}

  async capture(request: BusinessContextRequest): Promise<BusinessContextSnapshot> {
    const capturedAt = this.now().toISOString();
    const channel = request.target.kind === 'direct' ? 'direct' : 'class';
    const messages: BusinessContextSnapshot['recentMessages'] = (request.target.recentMessages ?? [])
      .filter((message) => message.authorRole === 'teacher' || message.authorRole === 'student-family' || message.authorRole === 'class-agent')
      .slice(-6)
      .map(({ authorRole, authorName, body }) => ({ authorRole: authorRole as 'teacher' | 'student-family' | 'class-agent', authorName, body }));
    const version = stableVersion(JSON.stringify({
      threadRef: request.target.threadId,
      classLabel: request.target.classLabel,
      memberCount: request.target.memberCount,
      messages,
    }));
    const dwDerived = isDwDerivedTarget(request);
    const privateSnapshot = dwDerived ? await loadPrivateImDemoContext() : null;
    const privateContext = privateSnapshot?.thread.id === request.target.threadId ? privateSnapshot : null;
    const sourceRef = privateContext
      ? `dw-hunter:local-private:${privateContext.version}`
      : dwDerived ? 'dw-hunter:deidentified-im-pattern-2026-09-07-v1' : `message-thread:${request.target.threadId}`;
    return Object.freeze({
      id: `context-${request.target.threadId}-${capturedAt}`.replaceAll(/[^a-zA-Z0-9_-]/g, '-'),
      version,
      actorRef: request.actorRef,
      tenantRef: request.tenantRef,
      threadRef: request.target.threadId,
      channel,
      use: request.use,
      sources: Object.freeze([Object.freeze({
        kind: dwDerived ? 'dw-hunter' as const : 'fixed-demo' as const,
        owner: 'ClassIn' as const,
        sourceRef,
        permissionScope: `teacher:${request.actorRef}:${request.target.threadId}`,
        capturedAt,
        freshness: 'current' as const,
        version: privateContext?.version ?? (dwDerived ? DW_DERIVED_IM_LEARNING_CATALOG.version : version),
      })]),
      items: Object.freeze([
        Object.freeze({ key: 'conversation-label', label: channel === 'class' ? '当前班级' : '当前私聊', value: request.target.classLabel, sourceRef, sensitivity: 'standard' as const }),
        ...(request.target.memberCount === undefined ? [] : [Object.freeze({ key: 'member-count', label: '成员数', value: String(request.target.memberCount), sourceRef, sensitivity: 'standard' as const })]),
        ...(dwDerived ? [
          Object.freeze({ key: 'data-window', label: '数据窗口', value: privateContext?.dataWindow ?? (channel === 'class' ? '2026-09-01—2026-09-07（T-1）' : '2026-08-09—2026-09-07（T-1）'), sourceRef, sensitivity: 'standard' as const }),
          Object.freeze({ key: 'privacy-transform', label: '隐私处理', value: privateContext ? '消息原文仅存在本机私有快照；数据库标识已删除，发言者使用本机会话别名。' : '真实行级消息经过去标识化和业务事实压缩；原始姓名、UID、群ID与原文不进入 Demo。', sourceRef, sensitivity: 'standard' as const }),
          ...(privateContext ? [
            Object.freeze({ key: 'teaching-topics', label: '近期教学主题', value: privateContext.context.teachingTopics.join('、'), sourceRef, sensitivity: 'standard' as const }),
            Object.freeze({ key: 'interaction-patterns', label: '近期互动模式', value: privateContext.context.interactionPatterns.join('；'), sourceRef, sensitivity: 'standard' as const }),
            Object.freeze({ key: 'evidence-boundary', label: '证据边界', value: privateContext.context.evidenceBoundary, sourceRef, sensitivity: 'standard' as const }),
            Object.freeze({ key: 'activity-summary', label: '群聊活跃概况', value: `${privateContext.context.messageCount} 条窗口消息，${privateContext.context.activeSenderCount} 位发言者`, sourceRef, sensitivity: 'standard' as const }),
          ] : []),
        ] : []),
      ]),
      recentMessages: Object.freeze(messages.map((message) => Object.freeze(message))),
      excludedSensitiveCount: (request.target.recentMessages?.length ?? 0) - messages.length,
      truthLabel: dwDerived ? 'read-only-business-data' : 'fixed-demo',
    });
  }

  async listLearningContext(request: Omit<BusinessContextRequest, 'use'>) {
    const sourceCatalog = learningCatalogFor(request);
    const directStudent = request.target.kind === 'direct'
      ? sourceCatalog.students.find(({ directThreadRef }) => directThreadRef === request.target.threadId)
      : undefined;
    const supportedClassIds = new Set(['physics-3', DW_DERIVED_CLASS_ID]);
    const supported = request.target.kind === 'direct' ? Boolean(directStudent) : supportedClassIds.has(request.target.classId);
    return Object.freeze({
      ...sourceCatalog,
      students: supported ? (directStudent ? Object.freeze([directStudent]) : sourceCatalog.students) : Object.freeze([]),
      lessons: supported ? sourceCatalog.lessons : Object.freeze([]),
      assignments: supported ? sourceCatalog.assignments : Object.freeze([]),
      wrongQuestions: supported ? sourceCatalog.wrongQuestions : Object.freeze([]),
      periods: supported ? sourceCatalog.periods : Object.freeze([]),
      reminderReasons: supported ? sourceCatalog.reminderReasons : Object.freeze([]),
      lockedStudentRef: directStudent?.ref,
    });
  }

  async captureLearningContext(request: BusinessContextRequest & Readonly<{ selection: import('@contracts/workbuddy/business-context').LearningContextSelection }>): Promise<BusinessContextSnapshot> {
    const catalog = await this.listLearningContext(request);
    const { selection } = request;
    const selectionError = validateLearningSelectionAgainstCatalog(selection, catalog);
    if (selectionError) throw new Error(selectionError);
    const base = await this.capture(request);
    const evidence = learningEvidence(selection);
    const version = stableVersion(`${base.version}:${catalog.version}:${JSON.stringify(selection)}:${JSON.stringify(evidence)}`);
    return Object.freeze({
      ...base,
      id: `${base.id}-learning`,
      version,
      items: Object.freeze([
        ...base.items,
        Object.freeze({ key: 'learning-capability', label: '服务类型', value: selection.capability, sourceRef: 'learning-scenario:selection', sensitivity: 'standard' as const }),
        ...evidence.map((item, index) => Object.freeze({ key: `learning-evidence-${index + 1}`, label: item.label, value: item.value, sourceRef: `learning-scenario:${selection.capability}`, sensitivity: item.sensitivity })),
      ]),
      sources: Object.freeze([...base.sources, Object.freeze({
        kind: base.truthLabel === 'read-only-business-data' ? 'dw-hunter' as const : 'fixed-demo' as const,
        owner: 'ClassIn' as const,
        sourceRef: base.truthLabel === 'read-only-business-data' ? `dw-hunter:deidentified-learning:${selection.capability}` : `learning-scenario:${selection.capability}`,
        permissionScope: `teacher:${request.actorRef}:${request.target.threadId}:learning`,
        capturedAt: base.sources[0]?.capturedAt ?? this.now().toISOString(),
        freshness: 'current' as const,
        version: catalog.version,
      })]),
      truthLabel: catalog.truthLabel,
    });
  }
}
