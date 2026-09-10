import type {
  ConversationResourceRepository,
  MessageHistorySearch,
  MessageTranslationService,
} from '@contracts/message/im2-services';
import { filterConversationResources, searchThreadEntries, type MessageResourceRef } from '@domain/message/im2-basic';

type ScopedMessageResource = Readonly<{
  resource: MessageResourceRef;
  threadIds?: readonly string[];
  classIds?: readonly string[];
}>;

export const SCOPED_MESSAGE_RESOURCES: readonly ScopedMessageResource[] = Object.freeze([
  { threadIds: ['class-physics-3'], resource: { id: 'res-momentum-sheet', name: '动量守恒课堂练习单.pdf', kind: 'document', source: 'conversation', sizeLabel: '1.8 MB', updatedAt: '2026-08-08T08:40:00+08:00', truthLabel: 'SIMULATED' } },
  { threadIds: ['class-physics-3'], resource: { id: 'res-collision-board', name: '碰撞过程板书.png', kind: 'image', source: 'conversation', sizeLabel: '860 KB', updatedAt: '2026-08-08T10:16:00+08:00', truthLabel: 'SIMULATED' } },
  { classIds: ['physics-3'], resource: { id: 'res-unit-review', name: '动量单元复习课件.pptx', kind: 'courseware', source: 'class-space', sizeLabel: '6.4 MB', updatedAt: '2026-08-06T16:20:00+08:00', truthLabel: 'SIMULATED' } },
  { classIds: ['physics-3'], resource: { id: 'res-homework-guide', name: '错题订正说明.docx', kind: 'document', source: 'class-space', sizeLabel: '420 KB', updatedAt: '2026-08-05T18:00:00+08:00', truthLabel: 'SIMULATED' } },
  { threadIds: ['class-physics-1'], resource: { id: 'res-wave-board', name: '机械波图像课堂板书.png', kind: 'image', source: 'conversation', sizeLabel: '720 KB', updatedAt: '2026-08-07T12:16:00+08:00', truthLabel: 'SIMULATED' } },
  { classIds: ['physics-1'], resource: { id: 'res-wave-courseware', name: '机械波基础复习课件.pptx', kind: 'courseware', source: 'class-space', sizeLabel: '5.2 MB', updatedAt: '2026-08-06T11:30:00+08:00', truthLabel: 'SIMULATED' } },
  { threadIds: ['class-history-physics'], resource: { id: 'res-history-physics-outline', name: '高一物理基础复习提纲.pdf', kind: 'document', source: 'conversation', sizeLabel: '2.1 MB', updatedAt: '2026-05-18T09:55:00+08:00', truthLabel: 'SIMULATED' } },
  { classIds: ['history-physics'], resource: { id: 'res-history-physics-courseware', name: '期末复习课堂讲义.pptx', kind: 'courseware', source: 'class-space', sizeLabel: '4.8 MB', updatedAt: '2026-05-19T16:20:00+08:00', truthLabel: 'SIMULATED' } },
  { threadIds: ['class-english-2'], resource: { id: 'res-reading-locator', name: '阅读定位训练单.pdf', kind: 'document', source: 'conversation', sizeLabel: '1.2 MB', updatedAt: '2026-08-08T09:30:00+08:00', truthLabel: 'SIMULATED' } },
  { classIds: ['english-2'], resource: { id: 'res-reading-map', name: '主旨判断思维导图.png', kind: 'image', source: 'class-space', sizeLabel: '980 KB', updatedAt: '2026-08-07T17:25:00+08:00', truthLabel: 'SIMULATED' } },
  { threadIds: ['direct-wang-li'], resource: { id: 'res-direct-correction', name: '李明错题订正记录.pdf', kind: 'document', source: 'conversation', sizeLabel: '640 KB', updatedAt: '2026-08-08T13:20:00+08:00', truthLabel: 'SIMULATED' } },
]);

const TRANSLATIONS: Record<string, string> = {
  '明白了，我重新画一下过程图。': 'Got it. I will redraw the process diagram.',
  '练习单已经准备好了。': 'The practice worksheet is ready.',
  '下午的教研会我会带上本周课堂报告。': "I will bring this week's classroom report to the teaching meeting this afternoon.",
  '好的，重点看一下 3 班的订正情况。': 'Okay. Please focus on the correction progress of Class 3.',
  'Nice to meet you.': '很高兴认识你。',
};

export const mockMessageHistorySearch: MessageHistorySearch = {
  async search({ thread, filters }) {
    return searchThreadEntries(thread, filters);
  },
};

export const mockConversationResourceRepository: ConversationResourceRepository = {
  async search({ threadId, classId, query, kind }) {
    const visible = SCOPED_MESSAGE_RESOURCES
      .filter(({ threadIds, classIds }) => (
        threadIds?.includes(threadId) || (classId !== undefined && classIds?.includes(classId))
      ))
      .map(({ resource }) => resource);
    return filterConversationResources(visible, query, kind);
  },
};

export const mockMessageTranslationService: MessageTranslationService = {
  async translate({ messageId, sourceBody, targetLocale }) {
    const translatedBody = TRANSLATIONS[sourceBody]
      ?? (targetLocale === 'en'
        ? `English translation: ${sourceBody}`
        : `中文译文：${sourceBody}`);
    return Object.freeze({ messageId, sourceBody, targetLocale, translatedBody, truthLabel: 'SIMULATED' as const });
  },
};
