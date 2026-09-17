import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  MessageWorkspace,
  MessageWorkspaceProvider,
  type MessageWorkspaceScenario,
} from '@features/message-workspace';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';
import type { MessageMediaAdapter } from '@contracts/message/message-media';
import { createMemoryMessageMediaAdapter } from '@features/message-media/message-media-adapter';
import type { DesktopNotificationAdapter } from '@contracts/message/message-attention';
import { createMemoryDesktopNotificationAdapter } from '@features/message-attention/desktop-notification-adapter';

function createFixedMessageScenario(): MessageWorkspaceScenario {
  return {
    status: 'ready',
    threads: structuredClone(MESSAGE_THREADS),
    mutedThreadIds: new Set(['class-english-2']),
  };
}

function renderWorkspace(
  role: 'teacher' | 'student-family',
  initialEntry = '/',
  scenario: MessageWorkspaceScenario = createFixedMessageScenario(),
  mediaAdapter?: MessageMediaAdapter,
  notificationAdapter?: DesktopNotificationAdapter,
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MessageWorkspaceProvider scenario={scenario} mediaAdapter={mediaAdapter} notificationAdapter={notificationAdapter}>
        <MessageWorkspace role={role} />
        <LocationProbe />
      </MessageWorkspaceProvider>
    </MemoryRouter>,
  );
}

function renderFocusedWorkspace(
  role: 'teacher' | 'student-family',
  fixedClassId: string,
  readOnly = false,
) {
  return render(
    <MemoryRouter>
      <MessageWorkspaceProvider scenario={createFixedMessageScenario()}>
        <MessageWorkspace role={role} fixedClassId={fixedClassId} readOnly={readOnly} />
      </MessageWorkspaceProvider>
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

describe('message workspace', () => {
  it('keeps Class announcements and important reminders while omitting single-message pinning', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3');

    const announcement = screen.getByRole('region', { name: '班级公告' });
    expect(within(announcement).getByText('课前练习单提醒')).toBeInTheDocument();
    expect(within(announcement).getByRole('button', { name: '管理公告' })).toBeInTheDocument();
    const reminder = screen.getByRole('region', { name: '重要提醒' });
    expect(within(reminder).getByText(/@所有人/)).toBeInTheDocument();
    expect(screen.queryByText('置顶', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(取消)?置顶$/ })).not.toBeInTheDocument();

    await user.click(within(reminder).getByRole('button', { name: '关闭重要提醒' }));
    expect(screen.queryByRole('region', { name: '重要提醒' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '班级公告' })).toBeInTheDocument();
  });

  it('aggregates @mine, marks only the located item read and shows the stable new-message boundary', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3');

    expect(screen.getByText('以下为新消息')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看@我的' }));
    const attention = screen.getByRole('complementary', { name: '@我的' });
    expect(within(attention).getByText('提到你')).toBeInTheDocument();
    expect(within(attention).getByText(/高二物理 3 班 · 李明/)).toBeInTheDocument();
    await user.click(within(attention).getByRole('button', { name: /提到你/ }));
    await waitFor(() => expect(document.querySelector('[data-message-id="cp3-4"]')).toHaveAttribute('data-highlighted', 'true'));

    await user.click(screen.getByRole('button', { name: '查看@我的' }));
    expect(within(screen.getByRole('complementary', { name: '@我的' })).getByText('没有未读的提及消息')).toBeInTheDocument();
  });

  it('keeps desktop-notification permission explicit and testable through the adapter', async () => {
    const user = userEvent.setup();
    const notifications = createMemoryDesktopNotificationAdapter('granted');
    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3', createFixedMessageScenario(), undefined, notifications);

    await user.click(screen.getByRole('button', { name: '桌面通知设置' }));
    const settings = screen.getByRole('complementary', { name: '桌面通知设置' });
    expect(within(settings).getByText('已启用')).toBeInTheDocument();
    await user.click(within(settings).getByRole('button', { name: '发送测试通知' }));
    expect(await within(settings).findByText('测试通知已发送。')).toBeInTheDocument();
    expect(notifications.delivered).toHaveLength(1);
  });

  it('renders a focused class chat without message categories or other threads', () => {
    renderFocusedWorkspace('teacher', 'physics-3');
    expect(screen.getByText('班级群聊')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '高二物理 3 班' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '消息分类' })).not.toBeInTheDocument();
    expect(screen.queryByText('高二物理 1 班')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加图片' })).toBeInTheDocument();
  });

  it('renders approved Markdown messages as structured chat content', () => {
    const scenario = createFixedMessageScenario();
    if (scenario.status !== 'ready') throw new Error('Expected the fixed message scenario to be ready.');
    const thread = scenario.threads.find(({ id }) => id === 'class-physics-3');
    expect(thread).toBeDefined();
    thread!.entries.push({
      id: 'approved-structured-message',
      authorRole: 'teacher',
      authorName: '王老师',
      sentAt: '2026-09-17T10:00:00+08:00',
      kind: 'text',
      body: `## 小石头学情摘要

| 项目 | 内容 |
| --- | --- |
| **学生** | 小石头 |
| **课程** | 初中数学专题提升课程 |

1. **在线课堂**：已完成
2. **单元练习**：未提交

- **学习资料**：个人完成状态未知

> 以上仅整理有依据的数据。`,
    });

    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3', scenario);

    const message = document.querySelector('[data-message-id="approved-structured-message"]');
    expect(message).not.toBeNull();
    expect(within(message as HTMLElement).getByRole('heading', { name: '小石头学情摘要' })).toBeInTheDocument();
    expect(within(message as HTMLElement).getByRole('table')).toBeInTheDocument();
    expect(message!.querySelectorAll('strong')).toHaveLength(5);
    expect(message!.querySelector('ol')).toBeInTheDocument();
    expect(message!.querySelector('ul')).toBeInTheDocument();
    expect(message!.querySelector('blockquote')).toBeInTheDocument();
    expect(message).not.toHaveTextContent('| --- | --- |');
    expect(message).not.toHaveTextContent('**学生**');
  });

  it('keeps the ordinary media composer on teacher and student class/direct entries while isolating Agent direct chats', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family', '/student/messages?category=class&thread=class-physics-3');
    expect(screen.getByRole('button', { name: '添加图片' })).toBeInTheDocument();

    cleanup();
    renderWorkspace('teacher', '/teacher/messages?category=direct&thread=direct-teacher-zhang');
    expect(screen.getByRole('button', { name: '添加图片' })).toBeInTheDocument();

    cleanup();
    renderWorkspace('teacher', '/teacher/messages?category=direct&thread=direct-class-agent-physics-3-teacher');
    expect(screen.queryByRole('button', { name: '添加图片' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '添加附件' }));
    expect(screen.getByRole('button', { name: '截图' })).toBeDisabled();
  });

  it('makes a completed class chat fully read-only', () => {
    renderFocusedWorkspace('teacher', 'physics-3', true);
    expect(screen.getByRole('status')).toHaveTextContent('当前群聊仅供查看');
    expect(screen.queryByRole('textbox', { name: '输入消息' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '打开表情与贴纸' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加附件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /置顶|撤回|全体禁言/ })).not.toBeInTheDocument();
  });

  it('disables every student send path in a muted class scenario', () => {
    renderFocusedWorkspace('student-family', 'english-2');
    expect(screen.getByRole('status')).toHaveTextContent('当前群聊已开启全体禁言');
    expect(screen.queryByRole('textbox', { name: '输入消息' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '打开表情与贴纸' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加附件' })).not.toBeInTheDocument();
  });

  it('keeps the preloaded class invitation as an informational notice without join actions or a class deep link', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family');
    await user.click(screen.getByRole('button', { name: /系统通知/ }));
    const notice = screen.getByRole('article', { name: '王老师邀请你加入班级' });
    expect(notice).toBeInTheDocument();
    expect(within(notice).queryByRole('button', { name: /加入班级|接受邀请/ })).not.toBeInTheDocument();
    await user.click(within(notice).getByRole('button', { name: '查看邀请说明' }));
    expect(screen.getByRole('status')).toHaveTextContent('没有加入动作或班级深链');
    expect(screen.getByTestId('location')).toHaveTextContent('category=system&thread=system-student-class-invite');
  });

  it('lets a teacher chat and manage one concrete class group', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3');

    expect(screen.getByRole('heading', { name: '高二物理 3 班' })).toBeInTheDocument();
    expect(screen.getAllByText(/请大家课前准备好课堂练习单，作业仍在今天 18:00 截止。/).length).toBeGreaterThanOrEqual(2);

    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '课前见');
    await user.click(screen.getByRole('button', { name: '发送' }));
    expect(screen.getAllByText('课前见')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('本地 Demo 中发送');

    expect(screen.queryByRole('button', { name: /^(取消)?置顶$/ })).not.toBeInTheDocument();
    const contextTrigger = screen.getByRole('button', { name: '会话管理' });
    await user.click(contextTrigger);
    expect(within(screen.getByRole('menu', { name: '会话管理' })).getByRole('menuitem', { name: '管理公告' })).toHaveFocus();
    await user.click(within(screen.getByRole('menu', { name: '会话管理' })).getByRole('menuitem', { name: '全体禁言' }));
    await waitFor(() => expect(contextTrigger).toHaveFocus());
    await user.click(contextTrigger);
    expect(within(screen.getByRole('menu', { name: '会话管理' })).getByRole('menuitem', { name: '解除禁言' })).toBeInTheDocument();
  });

  it('shares one teacher management entry across class and direct chats', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');
    expect(screen.queryByRole('button', { name: '进入班级' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '会话管理' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '私聊' }));
    expect(screen.queryByRole('button', { name: '进入班级' })).not.toBeInTheDocument();
    const managementTrigger = screen.getByRole('button', { name: '会话管理' });
    await user.click(managementTrigger);
    const menu = screen.getByRole('menu', { name: '会话管理' });
    expect(within(menu).getByRole('menuitem', { name: '联系人资料' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitem', { name: '消息免打扰' }));
    expect(screen.getByRole('status')).toHaveTextContent('已开启消息免打扰');
    await user.click(managementTrigger);
    expect(within(screen.getByRole('menu', { name: '会话管理' })).getByRole('menuitem', { name: '关闭消息免打扰' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /张老师.*重点看一下 3 班的订正情况/ }));
    const teacherTitle = screen.getByRole('heading', { name: '张老师' });
    const conversationHeader = teacherTitle.closest('header');
    expect(conversationHeader).toHaveAttribute('data-message-header', 'conversation');
    expect(teacherTitle.nextElementSibling).toHaveTextContent('联系人 · 物理教研组');
    expect(teacherTitle.parentElement).toHaveTextContent('张老师联系人 · 物理教研组');
  });

  it('keeps teacher management out of the student view and exposes task-safe notice actions', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family');

    expect(screen.queryByRole('button', { name: '会话管理' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /置顶/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /全体禁言/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /系统通知/ }));
    await user.click(screen.getByRole('button', { name: /机械波错题订正被退回/ }));
    expect(screen.getByRole('heading', { name: '机械波错题订正被退回' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '去订正' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/student/homework/homework-correction/edit?source=notification&notification=system-student-returned&mode=correction');
  });

  it('routes public-course lifecycle notices through system notifications', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family', '/student/messages?category=system&thread=system-open-course-open-math-live');

    const notice = screen.getByRole('article', { name: '数学思维直播公开课正在进行' });
    expect(within(notice).getByText('公开课 · 直播中')).toBeInTheDocument();
    expect(within(notice).getByText('26/40 人')).toBeInTheDocument();
    await user.click(within(notice).getByRole('button', { name: '进入教室' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/student/open-courses/open-math-live/preflight?source=notification&notification=system-open-course-open-math-live');
  });

  it('renders ClassIn assistant content only inside official announcements', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=official&thread=official-getting-started');

    const notice = screen.getByRole('article', { name: '第一次使用 ClassIn PC：从课程表开始' });
    expect(within(notice).getAllByText('ClassIn 助手 · 官方').length).toBeGreaterThan(0);
    expect(within(notice).getByText('ClassIn PC 入门指南')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '官方公告' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '系统通知' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(notice).getByRole('button', { name: '查看内容说明' }));
    expect(within(notice).getByRole('status')).toHaveTextContent('已完整展开');
  });

  it('reuses a unique direct thread from the directory and restores dialog focus', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family');

    await user.click(screen.getByRole('button', { name: /私聊/ }));
    const contactTrigger = screen.getByRole('button', { name: '通讯录' });
    await user.click(contactTrigger);
    expect(screen.getByRole('dialog', { name: '通讯录' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(contactTrigger).toHaveFocus());

    await user.click(contactTrigger);
    const dialog = screen.getByRole('dialog', { name: '通讯录' });
    await user.type(within(dialog).getByRole('textbox', { name: '搜索联系人、班级或公开课' }), '王老师');
    await user.click(within(dialog).getByRole('button', { name: '查看资料' }));
    await user.click(within(dialog).getByRole('button', { name: '发消息' }));

    expect(screen.queryByRole('dialog', { name: '通讯录' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '王老师' })).toBeInTheDocument();
    await waitFor(() => expect(contactTrigger).toHaveFocus());
  });

  it('browses new friends, alphabetic friends and the organization tree in one directory', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=direct');
    await user.click(screen.getByRole('button', { name: '通讯录' }));
    const dialog = screen.getByRole('dialog', { name: '通讯录' });

    await user.click(within(dialog).getByRole('button', { name: /新好友/ }));
    expect(within(dialog).getByText('9月9日')).toBeInTheDocument();
    expect(within(dialog).getByText('林老师')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '接受' }));
    expect(within(dialog).getByRole('status')).toHaveTextContent('接受好友申请');

    await user.click(within(dialog).getByRole('button', { name: /^好友3$/ }));
    expect(within(dialog).getByText('3 位好友')).toBeInTheDocument();
    expect(within(dialog).getByRole('navigation', { name: '好友字母索引' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '组织架构' }));
    await user.click(within(dialog).getByRole('button', { name: '教学中心' }));
    await user.click(within(dialog).getByRole('button', { name: '物理教研组' }));
    expect(within(dialog).getByRole('navigation', { name: '组织路径' })).toHaveTextContent('ClassIn 教学机构（演示）教学中心物理教研组');
    expect(within(dialog).getByText('张老师')).toBeInTheDocument();
  });

  it('discovers contacts, classes and open courses by stable business identifiers', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=direct');
    await user.click(screen.getByRole('button', { name: '通讯录' }));
    let dialog = screen.getByRole('dialog', { name: '通讯录' });
    const search = within(dialog).getByRole('textbox', { name: '搜索联系人、班级或公开课' });
    await user.type(search, 'PHY2303');
    expect(within(dialog).getByText('高二物理 3 班')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '进入班级' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/teacher/classes/physics-3?source=messages');

    cleanup();
    renderWorkspace('teacher', '/teacher/messages?category=direct');
    await user.click(screen.getByRole('button', { name: '通讯录' }));
    dialog = screen.getByRole('dialog', { name: '通讯录' });
    await user.type(within(dialog).getByRole('textbox', { name: '搜索联系人、班级或公开课' }), 'OC-READ-0808');
    expect(within(dialog).getByText('高效阅读公开课')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '查看公开课' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/teacher/open-courses/open-reading?source=messages');
  });

  it('keeps contact remarks, recommendations and identity sharing explicitly local', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=direct');
    await user.click(screen.getByRole('button', { name: '通讯录' }));
    const dialog = screen.getByRole('dialog', { name: '通讯录' });
    await user.click(within(dialog).getByRole('button', { name: /分享我的身份/ }));
    expect(within(dialog).getByLabelText('教师演示身份二维码')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '复制口令' }));
    expect(within(dialog).getByRole('status')).toHaveTextContent('IN-TEACH-2026');

    await user.clear(within(dialog).getByRole('textbox', { name: '搜索联系人、班级或公开课' }));
    await user.type(within(dialog).getByRole('textbox', { name: '搜索联系人、班级或公开课' }), 'CI200317');
    await user.click(within(dialog).getByRole('button', { name: '查看资料' }));
    const remark = within(dialog).getByRole('textbox', { name: '备注' });
    await user.clear(remark);
    await user.type(remark, '备课协作');
    await user.click(within(dialog).getByRole('button', { name: '保存备注' }));
    expect(within(dialog).getByRole('status')).toHaveTextContent('备注已保存');
  });

  it('selects, removes, sends and opens fixed contact cards', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=direct&thread=direct-teacher-zhang');

    await user.click(screen.getByRole('button', { name: '添加附件' }));
    await user.click(screen.getByRole('button', { name: '名片' }));
    const picker = screen.getByRole('dialog', { name: '发送联系人名片' });
    await user.click(within(picker).getByRole('button', { name: /李明/ }));
    await user.click(within(picker).getByRole('button', { name: /张老师/ }));
    await user.click(within(picker).getByRole('button', { name: '添加 2 张名片' }));

    expect(screen.queryByText('已选择 2/5')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移除名片李明' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '移除名片李明' }));
    await user.click(screen.getByRole('button', { name: '发送' }));

    const card = screen.getByRole('button', { name: '查看联系人资料 张老师' });
    expect(card).toBeInTheDocument();
    await user.click(card);
    const profile = screen.getByRole('dialog', { name: '张老师' });
    expect(within(profile).getByText('CI200317')).toBeInTheDocument();
    expect(within(profile).getByText('139****0317')).toBeInTheDocument();
    await user.click(within(profile).getByRole('button', { name: '发消息' }));
    expect(screen.getByTestId('location')).toHaveTextContent('category=direct&thread=direct-teacher-zhang');
  });

  it('enters a live temporary classroom and keeps an ended card closed', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family', '/student/messages?category=class&thread=class-physics-3');
    expect(screen.getByText('动量守恒 15 分钟答疑')).toBeInTheDocument();
    expect(screen.getByText('本次邀请：李明、周然等 4 位成员')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '进入临时教室' }));
    expect(screen.getByRole('status')).toHaveTextContent('已进入临时教室演示');

    cleanup();
    renderWorkspace('student-family', '/student/messages?category=class&thread=class-english-2');
    expect(screen.getByText('阅读定位小组答疑')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '已结束' })).toBeDisabled();
  });

  it('searches only the current category and marks that category read', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');

    await user.click(screen.getByRole('button', { name: /私聊/ }));
    await user.type(screen.getByRole('textbox', { name: '搜索私聊和班级 Agent' }), '不存在');
    expect(screen.getByText('没有匹配的私聊或 Agent')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清除搜索' }));
    expect(screen.getByRole('textbox', { name: '搜索私聊和班级 Agent' })).toHaveValue('');
    const menuTrigger = screen.getByRole('button', { name: '私聊列表操作' });
    await user.click(menuTrigger);
    const menu = screen.getByRole('menu', { name: '私聊列表操作' });
    expect(within(menu).getByRole('menuitem', { name: '加入与添加' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitem', { name: '全部标为已读' }));
    await waitFor(() => expect(menuTrigger).toHaveFocus());
    expect(screen.getByRole('button', { name: '私聊' })).toBeInTheDocument();
  });

  it('contains menu focus and restores the trigger on Escape', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher');
    const trigger = screen.getByRole('button', { name: '班级消息列表操作' });

    await user.click(trigger);
    expect(screen.getByRole('menuitem', { name: '全部标为已读' })).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu', { name: '班级消息列表操作' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('renders loading, error, category-empty and capped unread states', async () => {
    renderWorkspace('teacher', '/', { status: 'loading' });
    expect(screen.getByLabelText('消息正在加载')).toHaveAttribute('aria-busy', 'true');

    cleanup();
    renderWorkspace('teacher', '/', { status: 'error', message: '请稍后重试' });
    expect(screen.getByRole('alert')).toHaveTextContent('消息暂时无法加载请稍后重试');

    cleanup();
    renderWorkspace('teacher', '/', { status: 'ready', threads: [] });
    expect(screen.getAllByText('暂无班级消息')).toHaveLength(2);

    cleanup();
    const threads = MESSAGE_THREADS.map((thread) => thread.id === 'direct-teacher-zhang'
      ? { ...thread, unreadByRole: { ...thread.unreadByRole, teacher: 120 } }
      : thread);
    renderWorkspace('teacher', '/teacher/messages?category=direct', { status: 'ready', threads });
    expect(screen.getAllByText('99+')).toHaveLength(2);
  });

  it('groups consecutive messages from one sender and keeps task-state copy out of official announcements', async () => {
    const user = userEvent.setup();
    const threads = MESSAGE_THREADS.map((thread) => thread.id === 'class-physics-3'
      ? {
        ...thread,
        entries: [
          ...thread.entries,
          {
            id: 'cp3-5',
            authorRole: 'student-family' as const,
            authorName: '李明',
            body: '我会提前进入教室。',
            sentAt: '2026-08-08T14:09:00+08:00',
            kind: 'text' as const,
          },
        ],
      }
      : thread);
    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3', { status: 'ready', threads });

    expect(screen.getAllByText(/李明 ·/)).toHaveLength(1);
    expect(screen.getAllByText('我会提前进入教室。')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '官方公告' }));
    expect(screen.getByRole('heading', { name: 'ClassIn PC 体验更新说明' })).toBeInTheDocument();
    expect(screen.queryByText('阅读消息不会改变待办的处理状态')).not.toBeInTheDocument();
  });

  it('keeps all four categories in the compact list panel without a standalone category spine', () => {
    renderWorkspace('teacher');
    expect(screen.queryByRole('navigation', { name: '消息分类' })).not.toBeInTheDocument();
    const categories = screen.getByRole('group', { name: '消息分类' });
    for (const label of ['私聊', '班级消息', '系统通知', '官方公告']) {
      expect(within(categories).getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('sends a reply reference and supports quick plus expanded message reactions', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3');
    const target = document.querySelector<HTMLElement>('[data-message-id="cp3-3"]');
    expect(target).not.toBeNull();

    await user.click(within(target!).getByRole('button', { name: '回复' }));
    expect(screen.getByText('回复 李明')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '收到，我会在群里说明。');
    await user.click(screen.getByRole('button', { name: '发送' }));
    expect(screen.getByRole('button', { name: /李明.*练习单已经准备好了/ })).toBeInTheDocument();

    await user.click(within(target!).getByRole('button', { name: '添加 👍 Reaction' }));
    expect(within(target!).getByRole('button', { name: /取消 👍 Reaction，当前 1 人/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(target!).getByRole('button', { name: /取消 👍 消息回应，当前 1 人/ })).toBeVisible();
    await user.click(within(target!).getByRole('button', { name: /取消 👍 Reaction/ }));
    expect(within(target!).getByRole('button', { name: '添加 👍 Reaction' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(target!).queryByRole('button', { name: /👍 消息回应/ })).not.toBeInTheDocument();

    const pickerTrigger = within(target!).getByRole('button', { name: '添加表情回应' });
    await user.click(pickerTrigger);
    const picker = screen.getByRole('dialog', { name: '添加表情回应' });
    expect(within(picker).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(picker).queryByRole('tab')).not.toBeInTheDocument();
    expect(within(picker).queryByText('最近')).not.toBeInTheDocument();
    await user.click(within(picker).getByRole('button', { name: '用 🎉 回应' }));
    expect(screen.queryByRole('dialog', { name: '添加表情回应' })).not.toBeInTheDocument();
    expect(within(target!).getByRole('button', { name: /取消 🎉 消息回应，当前 1 人/ })).toBeVisible();

    await user.click(pickerTrigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(pickerTrigger).toHaveFocus());
  });

  it('searches message history and locates the matching message', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3');
    await user.click(screen.getByRole('button', { name: '搜索聊天记录' }));
    const panel = screen.getByRole('complementary', { name: '搜索聊天记录' });
    await user.type(within(panel).getByPlaceholderText('输入消息关键词'), '正负号');
    await user.click(within(panel).getByRole('button', { name: '搜索' }));
    expect(await within(panel).findByText('找到 1 条消息')).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: /王老师，今天动量守恒练习单第 5 题/ }));
    await waitFor(() => expect(document.querySelector('[data-message-id="cp3-4"]')).toHaveAttribute('data-highlighted', 'true'));
  });

  it('reuses a simulated conversation resource and shows side-by-side translation', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3');
    await user.click(screen.getByRole('button', { name: '查找会话资源' }));
    const resources = screen.getByRole('complementary', { name: '群文件' });
    expect(within(resources).getByText(/高二物理 3 班 · 当前范围/)).toBeInTheDocument();
    expect(within(resources).queryByText('阅读定位训练单.pdf')).not.toBeInTheDocument();
    const resourceName = await within(resources).findByText('动量守恒课堂练习单.pdf');
    await user.click(within(resourceName.closest('article')!).getByRole('button', { name: '引用' }));
    expect(within(resourceName.closest('article')!).getByRole('button', { name: '已引用' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(resources).getByRole('button', { name: '关闭会话资源' }));
    await waitFor(() => expect(screen.queryByRole('complementary', { name: '群文件' })).not.toBeInTheDocument());
    expect(screen.getByText('动量守恒课堂练习单.pdf')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '请查收这份练习单。');
    await user.click(screen.getByRole('button', { name: '发送' }));
    expect(await screen.findByText('PDF · 1.8 MB · SIMULATED')).toBeInTheDocument();

    const target = document.querySelector<HTMLElement>('[data-message-id="cp3-3"]');
    await user.click(within(target!).getByRole('button', { name: '翻译' }));
    expect(await screen.findByText('The practice worksheet is ready.')).toBeInTheDocument();
    expect(screen.getByText('译文 · SIMULATED')).toBeInTheDocument();
  });

  it('opens class-scoped group information, restores focus and keeps the class route connected', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3');
    const menuTrigger = screen.getByRole('button', { name: '会话管理' });
    await user.click(menuTrigger);
    await user.click(screen.getByRole('menuitem', { name: '群资料' }));

    const profile = screen.getByRole('complementary', { name: '群资料' });
    expect(within(profile).getByText('班级号 PHY2303')).toBeInTheDocument();
    expect(within(profile).getByText('30 人')).toBeInTheDocument();
    expect(within(profile).getByText('小吴')).toBeInTheDocument();
    expect(within(profile).getByText('4 位可见 / 30 人')).toBeInTheDocument();
    expect(within(profile).getByText('课前练习单提醒')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('complementary', { name: '群资料' })).not.toBeInTheDocument());
    expect(menuTrigger).toHaveFocus();

    await user.click(menuTrigger);
    await user.click(screen.getByRole('menuitem', { name: '群资料' }));
    await user.click(within(screen.getByRole('complementary', { name: '群资料' })).getByRole('button', { name: '进入班级' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/teacher/classes/physics-3');
  });

  it('lets students inspect the same class facts without exposing class management actions', async () => {
    const user = userEvent.setup();
    renderWorkspace('student-family', '/student/messages?category=class&thread=class-physics-3');
    await user.click(screen.getByRole('button', { name: '班级会话操作' }));
    expect(screen.queryByRole('menuitem', { name: '全体禁言' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: '群资料' }));
    const profile = screen.getByRole('complementary', { name: '群资料' });
    expect(within(profile).getByText('我的身份')).toBeInTheDocument();
    expect(within(profile).getByText('学生')).toBeInTheDocument();
    expect(within(profile).getByText(/管理动作未接入/)).toBeInTheDocument();
  });

  it('uploads, pastes, sends, views and recalls image messages', async () => {
    const user = userEvent.setup();
    const adapter = createMemoryMessageMediaAdapter();
    const view = renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3', undefined, adapter);
    const png = new File([Uint8Array.from([137, 80, 78, 71])], '课堂板书.png', { type: 'image/png' });
    const picker = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(picker).not.toBeNull();
    fireEvent.change(picker!, { target: { files: [png] } });
    expect(await screen.findByRole('list', { name: '已添加 1 张图片' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '发送' }));

    const image = await screen.findByRole('button', { name: '查看图片 课堂板书.png' });
    await user.click(image);
    expect(screen.getByRole('dialog', { name: '媒体查看器' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(image).toHaveFocus());

    const article = image.closest('article');
    expect(article).not.toBeNull();
    await user.click(within(article!).getByRole('button', { name: '回复' }));
    expect(screen.getByText(/回复 王老师/)).toBeInTheDocument();
    await user.click(within(article!).getByRole('button', { name: '添加 👍 Reaction' }));
    await user.click(within(article!).getByRole('button', { name: '撤回' }));
    expect(within(article!).getByText('消息已撤回')).toBeInTheDocument();
    expect(within(article!).queryByRole('button', { name: /查看图片/ })).not.toBeInTheDocument();

    const pasted = new File([Uint8Array.from([255, 216, 255])], '粘贴图片.jpg', { type: 'image/jpeg' });
    fireEvent.paste(screen.getByRole('textbox', { name: '输入消息' }), { clipboardData: { items: [{ kind: 'file', getAsFile: () => pasted }] } });
    expect(await screen.findByText('粘贴图片.jpg')).toBeInTheDocument();
  });

  it.each([
    ['teacher', '李明'],
    ['student-family', '王老师'],
  ] as const)('offers categorized emoji, favorites, teaching stickers and structured everyone mentions to %s', async (role, personName) => {
    const user = userEvent.setup();
    const routePrefix = role === 'teacher' ? 'teacher' : 'student';
    renderWorkspace(role, `/${routePrefix}/messages?category=class&thread=class-physics-3`);
    const textbox = screen.getByRole('textbox', { name: '输入消息' });
    await user.type(textbox, '@');
    const mentionPicker = screen.getByLabelText('选择提及对象');
    await user.click(within(mentionPicker).getByRole('option', { name: /所有人/ }));
    expect(textbox).toHaveValue('@所有人 ');
    await user.type(textbox, '请查看新资料');
    await user.type(textbox, ` @${personName.slice(0, 1)}`);
    await user.click(within(screen.getByLabelText('选择提及对象')).getByRole('option', { name: new RegExp(personName) }));

    await user.click(screen.getByRole('button', { name: '打开表情与贴纸' }));
    expect(screen.getByRole('tab', { name: '最近' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Emoji' }));
    await user.click(screen.getByRole('button', { name: '添加😀' }));
    expect(textbox).toHaveValue(`@所有人 请查看新资料 @${personName} 😀`);
    await user.click(screen.getByRole('button', { name: '收藏😀' }));
    await user.click(screen.getByRole('tab', { name: '我的' }));
    expect(screen.getByRole('button', { name: '添加😀' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '教学贴纸' }));
    await user.click(screen.getByRole('button', { name: '添加真棒' }));
    expect(screen.getByRole('list', { name: '已添加 1 张图片' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '发送' }));
    const expectedBody = `@所有人 请查看新资料 @${personName} 😀`;
    const sent = Array.from(document.querySelectorAll<HTMLElement>('article[data-mention-everyone="true"]'))
      .find((article) => article.querySelector('[data-message-body]')?.textContent === expectedBody);
    expect(sent).toHaveAttribute('data-mention-everyone', 'true');
  });

  it('crops a deterministic browser screenshot and exposes the unavailable hide-window capability', async () => {
    const user = userEvent.setup();
    const fixture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const adapter = createMemoryMessageMediaAdapter({ captureFixture: { contentUrl: fixture, width: 800, height: 600 } });
    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3', undefined, adapter);
    await user.click(screen.getByRole('button', { name: '添加附件' }));
    expect(screen.getByRole('button', { name: '隐藏当前窗口' })).toBeDisabled();
    const trigger = screen.getByRole('button', { name: '截图' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: '裁剪屏幕截图' });
    await user.click(within(dialog).getByRole('button', { name: '使用截图' }));
    expect(await screen.findByText('屏幕截图.png')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '添加附件' })).toHaveFocus());
  });

  it('opens the seeded received video in the local media viewer', async () => {
    const user = userEvent.setup();
    renderWorkspace('teacher', '/teacher/messages?category=class&thread=class-physics-3');
    const video = screen.getByRole('button', { name: '播放视频 碰撞实验回放.mp4' });
    expect(video).toHaveTextContent('0:05');
    await user.click(video);
    expect(screen.getByRole('dialog', { name: '媒体查看器' })).toBeInTheDocument();
    expect(screen.getByLabelText('碰撞实验回放.mp4'))
      .toHaveAttribute('src', '/media/momentum-collision-experiment.mp4');
    expect(screen.getByLabelText('碰撞实验回放.mp4')).toHaveAttribute('controls');
  });

  it('restores category and thread targets from the URL and reports unavailable targets', () => {
    const { unmount } = renderWorkspace('teacher', '/teacher/messages?category=direct&thread=direct-teacher-zhang');
    expect(screen.getByRole('heading', { name: '张老师' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: '消息分类' })).getByRole('button', { name: '私聊' })).toHaveAttribute('aria-pressed', 'true');

    unmount();
    renderWorkspace('student-family', '/student/messages?category=class&thread=missing-thread');
    expect(screen.getByRole('status')).toHaveTextContent('目标消息在当前视角不可用');
  });
});
