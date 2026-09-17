import type { GeneralQuestionAvailability, GeneralQuestionId } from '@contracts/workbuddy/general-question-guidance';
import { GENERAL_QUESTION_TEXT } from '@domain/workbuddy/general-question-guidance';

/** Capability declarations for the existing versioned physics fixture, not production API availability. */
export const PHYSICS_GENERAL_QUESTIONS: GeneralQuestionAvailability = {
  initialQuestionIds: ['A2', 'C2', 'E3'],
  questions: ([
    ['A1', GENERAL_QUESTION_TEXT.A1, ['plan-physics-2026-summer', 'physics-momentum', 'physics-wave', 'physics-induction']],
    ['A2', GENERAL_QUESTION_TEXT.A2, ['plan-physics-2026-summer', 'lesson-induction-0810']],
    ['A3', GENERAL_QUESTION_TEXT.A3, ['physics-3']],
    ['A4', '动量守恒模型这节课有哪些配套活动和资料？', ['lesson-momentum-0809', 'homework-momentum-a', 'quiz-momentum-check']],
    ['B1', '动量守恒模型这节课的到课情况怎么样？', ['lesson-momentum-0809', 'attendance-momentum-0809']],
    ['C1', '《动量守恒作业 A 组》要做什么，什么时候截止？', ['homework-momentum-a']],
    ['C2', '《动量守恒作业 A 组》还有谁没交，交上来的批完了吗？', ['homework-momentum-a']],
    ['D1', '帮我看看李明最近的学习情况', ['student-001', 'period-this-week']],
    ['D2', '李明还有哪些学习任务没完成？', ['student-001', 'homework-momentum-a', 'quiz-momentum-check']],
    ['D5', '根据李明的学情报告，帮我写一段给家长的话', ['student-001', 'period-this-week']],
    ['E3', '帮我把《动量守恒解题指引》里的方法整理成三点', ['resource-momentum-guide']],
    ['E4', GENERAL_QUESTION_TEXT.E4, ['period-this-week']],
  ] satisfies [GeneralQuestionId, string, string[]][]).map(([id, text, contextRefs]) => ({ id, text, contextRefs })),
};
