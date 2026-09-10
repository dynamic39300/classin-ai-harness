import type { MessagePublicationSnapshot } from '@domain/message/message-publication';

export const MESSAGE_PUBLICATION_SNAPSHOT: MessagePublicationSnapshot = Object.freeze({
  officialContents: Object.freeze([
    Object.freeze({ id: 'getting-started', topic: 'getting-started', topicLabel: '新手入门', title: '第一次使用 ClassIn PC：从课程表开始', summary: '认识首页、课程表和消息入口。', body: Object.freeze(['从首页查看今天的课程与待办，再进入消息处理班级沟通。', '本条为固定演示内容，用于验证官方来源与图文层级，不代表真实帮助中心版本。']), coverLabel: 'ClassIn PC 入门指南', publishedAt: '2026-08-07T12:30:00+08:00', visibleTo: Object.freeze(['teacher', 'student-family'] as const), unreadByRole: Object.freeze({ teacher: 1, 'student-family': 0 }) }),
    Object.freeze({ id: 'update', topic: 'product-update', topicLabel: '产品更新', title: 'ClassIn PC 体验更新说明', summary: '角色切换、课程表和任务路径更新。', body: Object.freeze(['新版 PC 工作台优化了角色切换、课程表和任务处理路径。', '更新说明只用于演示官方公告的信息层级，不代表真实版本发布。']), coverLabel: 'PC 工作台体验更新', publishedAt: '2026-08-08T09:00:00+08:00', visibleTo: Object.freeze(['teacher', 'student-family'] as const), unreadByRole: Object.freeze({ teacher: 1, 'student-family': 1 }) }),
    Object.freeze({ id: 'help', topic: 'help', topicLabel: '使用帮助', title: '消息通知与免打扰使用说明', summary: '了解未读、提及和免打扰的关系。', body: Object.freeze(['班级消息、系统通知和官方内容使用不同未读提示；免打扰不会删除消息。', '浏览器桌面通知需要用户主动授权，后台与跨设备推送仍取决于生产客户端。']), coverLabel: '消息与通知帮助', publishedAt: '2026-08-06T18:00:00+08:00', visibleTo: Object.freeze(['teacher', 'student-family'] as const), unreadByRole: Object.freeze({ teacher: 0, 'student-family': 0 }) }),
  ]),
});
