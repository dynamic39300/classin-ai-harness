import type { AppRole } from '@domain/account/role';
import type { OpenCourseRecord, OpenCourseStatus } from '@domain/class/class';
import { resolveOpenCourseStatus } from '@domain/open-course/open-course';
import type { MessageNotice, MessageThread } from './message';

export type OfficialContentTopic = 'getting-started' | 'product-update' | 'help';

export type OfficialContentItem = Readonly<{
  id: string;
  topic: OfficialContentTopic;
  topicLabel: string;
  title: string;
  summary: string;
  body: readonly string[];
  coverLabel: string;
  publishedAt: string;
  visibleTo: readonly AppRole[];
  unreadByRole: Partial<Record<AppRole, number>>;
}>;

export type MessagePublicationSnapshot = Readonly<{
  officialContents: readonly OfficialContentItem[];
}>;

type OpenCourseActionTarget = Extract<NonNullable<MessageNotice['actionTarget']>, { kind: 'open-course' }>;

function openCourseAction(status: OpenCourseStatus): OpenCourseActionTarget {
  return {
    kind: 'open-course',
    courseId: '',
    view: status === 'live' ? 'preflight' : status === 'ended' ? 'review' : 'detail',
  };
}

function openCourseCopy(status: OpenCourseStatus) {
  if (status === 'live') return { suffix: '正在进行', tag: '公开课 · 直播中', actionLabel: '进入教室' };
  if (status === 'ended') return { suffix: '已结束', tag: '公开课 · 已结束', actionLabel: '查看课后内容' };
  return { suffix: '即将开始', tag: '公开课 · 待开始', actionLabel: '查看公开课' };
}

function projectOpenCourseThread(course: OpenCourseRecord, clock: Date): MessageThread {
  const status = resolveOpenCourseStatus(course, clock);
  const copy = openCourseCopy(status);
  const target = openCourseAction(status);
  const endsAt = new Date(new Date(course.startsAt).getTime() + course.durationMinutes * 60_000).toISOString();
  const updatedAt = status === 'ended'
    ? endsAt
    : new Date(clock.getTime() - (status === 'live' ? 4.5 : 5.5) * 60 * 60_000).toISOString();
  return {
    id: `system-open-course-${course.id}`,
    category: 'system',
    visibleTo: course.visibleTo,
    titleByRole: Object.fromEntries(course.visibleTo.map((role) => [role, `${course.title}${copy.suffix}`])),
    subtitleByRole: Object.fromEntries(course.visibleTo.map((role) => [role, `公开课 · ${course.instructorName}`])),
    avatarByRole: Object.fromEntries(course.visibleTo.map((role) => [role, '课'])),
    updatedAt,
    unreadByRole: Object.fromEntries(course.visibleTo.map((role) => [role, status === 'ended' ? 0 : 1])),
    entries: [],
    notice: {
      tag: copy.tag,
      body: [course.description, status === 'live' ? '课堂正在进行，可先完成设备检查后进入教室。' : status === 'ended' ? '课程已结束，可进入详情查看课后内容和评价入口。' : '开课时间或课程状态变化会通过系统通知触达。'],
      actionLabel: copy.actionLabel,
      actionFeedback: '',
      actionTarget: { ...target, courseId: course.id },
      metadata: [
        { label: '授课教师', value: course.instructorName },
        { label: '开始时间', value: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(course.startsAt)) },
        { label: '报名席位', value: `${course.enrolledCount}/${course.maxSeats} 人` },
        { label: '课堂位置', value: course.classroomSummary },
      ],
      presentation: 'open-course',
      sourceLabel: 'ClassIn 公开课',
      coverLabel: `${course.subject} · ${status === 'live' ? '直播中' : status === 'ended' ? '已结束' : '待开始'}`,
    },
  };
}

function projectOfficialThread(item: OfficialContentItem): MessageThread {
  return {
    id: `official-${item.id}`,
    category: 'official',
    visibleTo: item.visibleTo,
    titleByRole: Object.fromEntries(item.visibleTo.map((role) => [role, item.title])),
    subtitleByRole: Object.fromEntries(item.visibleTo.map((role) => [role, 'ClassIn 助手 · 官方'])),
    avatarByRole: Object.fromEntries(item.visibleTo.map((role) => [role, 'C'])),
    updatedAt: item.publishedAt,
    unreadByRole: item.unreadByRole,
    entries: [],
    notice: {
      tag: item.topicLabel,
      body: [...item.body],
      actionLabel: '查看内容说明',
      actionFeedback: '当前内容已完整展开；本 Demo 不连接 ClassIn 官方内容服务。',
      metadata: [
        { label: '发布方', value: 'ClassIn 助手 · 官方' },
        { label: '内容类型', value: item.topicLabel },
        { label: '发布时间', value: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(item.publishedAt)) },
      ],
      presentation: 'official-content',
      sourceLabel: 'ClassIn 助手 · 官方',
      coverLabel: item.coverLabel,
    },
  };
}

export function projectMessagePublicationThreads(
  openCourses: ReadonlyArray<OpenCourseRecord>,
  snapshot: MessagePublicationSnapshot,
  clock: Date,
): MessageThread[] {
  return [
    ...openCourses.map((course) => projectOpenCourseThread(course, clock)),
    ...snapshot.officialContents.map(projectOfficialThread),
  ];
}
