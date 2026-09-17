---
title: IM Copilot 进入加载与三问动效验收
date: 2026-09-17
status: IMPLEMENTED_SELF_VERIFIED
parent: COPILOT-ENTRY-LOADING-IMPLEMENTATION.md
---

# 交付结果

[实施合同](./COPILOT-ENTRY-LOADING-IMPLEMENTATION.md) EL-1～EL-17 已实现并自验，最新 EL-T11～EL-T12 删除临时提示与冗余卡片，修正课中无课提示，等待用户体验验收。

- 已删除导航下常驻测试说明及其占位，保留消息实际发送方式与回执。
- 顶部首次加载保留四阶段骨架；折叠可见加载标记；后台刷新保留内容。
- 三问复用已审阅 A1/A2/A3 的文字和 ID，不等待推荐或问题目录；没有模拟业务值进入真实 Context。使用新的助手自我介绍，已删除问题上方的辅助说明行。
- 入场前有 180ms 短暂等待，快速就绪的推荐可直接展示；已入场三问至少保留 900ms，等待推荐渐显及稳定阅读后，再用 450ms 淡出并收起占位；悬停/键盘焦点保护正在进行的操作。减少动态效果关闭视觉动效。
- 历史默认收起时可展示三问；上滚或点击展开历史、本轮问题接收后移除；顶部当前阶段无可用建议、折叠或失败时保留。一旦退出，本次停留不再重现，“可以问什么”与输入框始终保留。
- 首次失败自动重试一次后使用紧凑失败状态；手动恢复后保持收起。目录失败仍保留班级通用问法和独立重试。
- 顶部身份说明与阶段导航的重复留白已收紧；鼠标/滚轮查看历史保留原输入焦点，键盘查看历史仍有可见焦点提示与 Tab 导航。

# EL-T11～EL-T12 提示与阶段内容收敛

用户本轮明确撤销提示 Toast 与按钮高亮，删去总结中“课程 · N 项教学活动 / 已核对活动完整性”只读行，并要求课中无课时仅作说明。

- 临时提示及高亮已完整移除，包括回调、父子组件状态、3秒定时器和 CSS 动画；三问渐变与普通“可以问什么”入口保持。
- `course-inventory` 已从真实推荐源投影删除，P08/P09/P10 与事实查询仍保留，不通过标题匹配隐藏。
- 无课时真实投影的课中 `items=[]`，Tab 显示“暂无”，区域仅有“当前没有正在上课的课堂”。没有任务卡、按钮或“仅供查看/无需处理”徽标。
- 排定上课时间内但实时考勤未知时，只提示课堂名称与“处于排定上课时间，实时到课情况暂未确认”；有未结束课堂但时间无效/缺失也保留未知，不能误报无课。开课时刻属于课中，结束时刻/接口已结束/取消/未发布均不进入课中。
- 已核验满勤以普通说明呈现、没有生成按钮；已有未进入提醒动作继续可用。真实测试环境尚无成员级实时正向证据，P03 保持外部阻塞，不以汇总人数或课后结果生成提醒/满勤结论。本次未增加实时 Reader。

| 检查 | 结果 |
| --- | --- |
| 相关 Vitest | 7 文件、44 项通过；覆盖推荐源投影、课堂时间边界/结束/取消/缺失、无库存行、满勤无动作、未进入提醒可用、渐变/输入保护与一小时更新 |
| 浏览器与无障碍 | 7 个独立用例通过；渐变不弹提示、普通帮助无高亮且目录可用、减少动态效果、课中无课/未知、总结保留回顾且无库存行、悬停/焦点保护、空/只读阶段及接口失败不产生模拟事实；相关 axe 通过 |
| 类型 / Lint / 构建 | 全部通过；构建保留原有大 chunk 提示 |
| 当前真实运行接口 | 4173 的 dynamics 只读核验：课前 1 条动作、课中 0 项、课后 3 条动作、总结 3 条动作；`course-inventory` 不存在，真实可操作建议仍为 7 条 |
| 视觉 | 无课为普通文字说明，有课但缺考勤为无按钮说明；总结保留课堂回顾。稳定截图另存 `.runtime/entry-stage-cleanup-final/` |

自动化使用隔离 fixture 验证满勤/未进入及边界分支，不向真实 Demo 注入数据；真实运行核验只读取接口并记录阶段数量，未发送群消息、生成 AI 答案或改动用户历史。

证据目录：`.runtime/entry-stage-cleanup/`，稳定状态截图：`.runtime/entry-stage-cleanup-final/`；构建日志 `.runtime/entry-stage-cleanup-build.log`。下方 EL-T8～EL-T10 的 Toast/高亮是上一轮实施证据，本轮已按用户反馈撤销。

# EL-T8～EL-T10 文案、更新频率与渐变交接验证

用户明确批准讨论中的四项建议。输入框使用方案 A；标题下方合为“N项｜选一条建议，AI写消息，您确认后发送”。常规 490px 侧栏和最小 384px 侧栏均已检查，示例说明可一行显示；更长状态自然换行，不缩字号或裁切。

推荐首次读取后，从成功时刻起算一小时；30 秒轮询已移除，窗口 focus 只检查是否超期。后台取消自动计时，回到前台时超期只启动一次；手动成功重置周期，失败继续保留原卡片并等待重试。实际问题的 Context capture 和发送校验未改动。

骨架变为推荐时使用 500ms 内容渐显和实测高度动画，900ms 稳定等待后执行 450ms 三问退场；已有悬停/焦点保护不变。自然交接结束后，在输入框上方短暂提示“这些问题也可以在这里找到”，同时高亮“可以问什么”一次；约 3 秒后结束，打开帮助或进入实际对话也会结束。提示不覆盖文字、不占布局、不写历史、不移动焦点。减少动态效果时关闭相关视觉动画。

| 验证 | 结果 |
| --- | --- |
| 相关 Vitest | 5 文件、32 项通过；含成功后起算、首次读取、手动重置、未到期 focus、后台暂停、超期返回去重、卸载清理、失败恢复、旧作用域隔离、三问交接、提示一次、焦点/历史/输入保护 |
| ClassIn 入口浏览器 | 11 个独立用例分批通过：先完成 9 项，合并文案后同步失败态文字定位并通过恢复用例；随后通过最终排版/交接及新增减少动态效果用例。含高度与透明度逐帧采样、三问退场顺序、提示不覆盖输入、问题目录保留 A1/A2/A3、384px 最小侧栏及 1100/1440/1920 视口、错误/空/只读/历史/焦点与 axe |
| 两个教师入口及已有教学操作 | 8 个独立用例分批通过：通用问题 4 项、入口一致性 1 项、教学任务触发/受控总结 2 项、顶部手动折叠/滚动 1 项；合计本轮 19 个独立浏览器用例通过 |
| 类型 / Lint / 构建 | 类型检查、全仓 Lint 与构建通过；构建仅有既有大 chunk 提示；最后的测试调整另作范围内 Lint 与类型复核 |
| 视觉与运行 | 已目检最小宽度和提示状态；说明层级清晰，提示位于输入框上方、无文字遮挡，发送入口可达；4173 预览 HTTP 200 |

入口一致性旧用例仍断言“完全没有 ClassIn 请求”，与 M0 已恢复的教师工作区连接发现冲突。已对照 `ClassInMessageConnectionProvider` 校准：隔离模拟 `/scene` 连接发现，仅允许该 GET，继续禁止演示班调用真实 catalog/context/dynamics。此处只修改旧测试预期，没有修改业务 Adapter 或放宽真实数据隔离。

本轮是 UI 与推荐读取节奏的验收，自动化使用隔离 fixture，未重新执行真实 API/DeepSeek 质量验收，未发送实际群消息或修改用户会话。原有 1,046 项全量结果仅是历史证据。

证据目录：`.runtime/entry-refinement-check/`（交互回归）、`.runtime/entry-refinement-recovery/`（错误恢复）、`.runtime/entry-refinement-final-visual/`（最终布局与减少动态效果）、`.runtime/entry-refinement-shared/`（两个入口通用问题）、`.runtime/entry-refinement-parity-final/`、`.runtime/entry-refinement-navigation/`、`.runtime/entry-refinement-collapse/`。构建日志：`.runtime/entry-refinement-build.log`。

最终截图：[最小侧栏宽度](../../../../.runtime/entry-refinement-final-visual/e2e-classin-messages-hybri-f3d5f-ages-close-without-clipping-chromium/navigation-minimum-width.png)、[提问入口提示](../../../../.runtime/entry-refinement-final-visual/e2e-classin-messages-hybri-9f7ff-changed-question-entry-a11y-chromium/handoff-help-cue.png)。

# EL-T7 顶部间距与历史焦点验证

根因：展开 Header 的 72px 最小高度与正文 8px 顶部 padding 叠加，浏览器测得说明到阶段导航间隙约 24.56px；历史展开后的布局效果无条件调用 `timeline.focus()`，在打字后滚轮查看历史时触发聊天区 `:focus-visible` 绿框。此次将展开态 Header 收至 56px，正文顶部 padding 收至 4px，并只在键盘激活历史入口时转移焦点。

| 检查 | 结果 |
| --- | --- |
| 修复前浏览器复现 | 两项新用例分别因顶部间隙超过 18px、滚轮展开历史后输入焦点丢失而失败，命中截图现象 |
| 修复后浏览器 | 3/3 通过；1440×900 与 1100×720 间隙在 4～18px 内且无裁切；打字后上滚保持输入/正文、聊天区无 outline；鼠标查看历史同样正常；Enter 查看历史可见焦点、Tab 导航与 axe 通过；原三问/历史联动仍通过 |
| 相关 Vitest | 4 文件、21 项通过 |
| 类型 / Lint / 构建 | 通过；构建仍有既有大 chunk 提示 |
| 视觉 | 已目检 1440×900 布局及滚轮展开后状态，推荐阶段层级保留，聊天区无整块绿框，输入框焦点保持可见 |

本次保留可聚焦聊天区与键盘焦点样式，只修正鼠标/滚轮路径的程序化焦点转移；不改业务取数、回答、发送和三问交接时序。自动化使用隔离 fixture，不操作用户真实会话内容。

证据：[收紧后的顶部](../../../../.runtime/entry-spacing-focus-after/e2e-classin-messages-hybri-f3d5f-ages-close-without-clipping-chromium/navigation-spacing-1440.png)、[滚轮展开历史保持输入焦点](../../../../.runtime/entry-spacing-focus-after/e2e-classin-messages-hybri-5737c--navigation-accessible-a11y-chromium/history-wheel-focus.png)。

# EL-T6 推荐交接与文案验证

开场采用“我是您的 AI 消息助手，可以帮您了解班级和课程的情况。您可以问：”，能力范围与当前按需查询一致。辅助说明及其状态计算已移除，输入保护与点击后的反馈继续保留。

| 检查 | 结果 |
| --- | --- |
| 相关 Vitest | 6 文件、29 项通过；含快速加载、最短可读时间、鼠标/键盘保护、退出不重现、历史优先及原问答保护 |
| ClassIn 入口浏览器 | 7/7 通过；加载/推荐交接、焦点保护、折叠卡片、当前空阶段、当前只读阶段、失败恢复、历史刷新/展开和减少动态效果 |
| 通用问题浏览器 | 4/4 通过；教师消息与班级聊天两个入口、输入/引用保护和长会话恢复 |
| 类型 / Lint / 构建 | 通过；构建仍有既有大 chunk 提示 |
| 视觉与无障碍 | 1440×900 的加载/交接后布局已目检，辅助行已移除；1100×720、1920×1080 校验发送按钮完整可达、无横向溢出；相关 axe 通过 |

浏览器使用隔离 UI 契约 fixture。此次不重新验证真实 API 或模型回答质量，不发送真实群消息，不修改或清空用户历史；未迁移 Skill 架构。首轮 1,046 项全量测试保留为历史记录，本轮执行与改动有关的回归。

当前视觉证据：[加载期间的新开场](../../../../.runtime/entry-handoff-check/e2e-classin-messages-hybri-e524d-d-keyboard-interaction-a11y-chromium/entry-loading-1440.png)、[保护键盘操作](../../../../.runtime/entry-handoff-check/e2e-classin-messages-hybri-e524d-d-keyboard-interaction-a11y-chromium/entry-interaction-protected.png)、[推荐就绪后三问退出](../../../../.runtime/entry-handoff-check/e2e-classin-messages-hybri-e524d-d-keyboard-interaction-a11y-chromium/entry-recommendations-only.png)。

# EL-T5 历史显示条件修正验证（上一轮）

根因：首轮实现将“存在已保存历史”当作隐藏条件，误解了用户要求。现在依据“历史已展开”或“本轮已有可见消息”隐藏，不改变会话存储和历史恢复边界。复用已有展示状态，不另加重复的持久化开关。

| 检查 | 结果 |
| --- | --- |
| 修复前复现 | 两项新增 UI 回归分别使用点击和上滚；均因“恢复历史后找不到三问”失败，命中本次问题 |
| 修复后相关 Vitest | 3 文件、15 项全部通过（引导、Sidecar、历史展示） |
| ClassIn 入口浏览器 | 3/3 通过；历史收起时动画播放 3 次、点击/真实滚轮展开后移除、刷新重现、新问题接收后退出且原会话仍可展开；延迟读取、失败恢复与减少动态效果同时通过 |
| 通用问题浏览器 | 4/4 通过；教师消息/班级聊天两个入口、原稿/引用保护、长会话恢复 |
| 类型 / Lint / 构建 | 全部通过；构建仍有既有大 chunk 提示 |
| 当前真实页面 | 已只读验证真实班级的上滚展开历史后移除三问，完整刷新后历史收起、三问恢复；输入框可达；未发送消息或清除历史 |

本轮运行与显示条件有关的回归，不重复首轮完整 1,046 项测试；不将该数字作为本轮重跑结果。当前修正不涉及 API、模型或 Skill。

# 首轮验证记录（EL-T1～EL-T4）

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test -- --maxWorkers=2` | 167 文件、1,046 测试全部通过，73.68 秒 |
| 通用问题浏览器回归 | 4/4 通过；教师消息与班级聊天两个入口、草稿保护、引用及历史恢复 |
| 真实接入 UI 契约浏览器回归 | 12/12 通过；含新增三项进入状态测试及既有消息发送、Markdown 表格/标题/列表兼容 |
| 补充无历史刷新动效验证 | 首轮 1/1 通过；当时“产生历史后刷新无引导”的断言已按 EL-T5 最新要求替换，不能作为当前预期 |
| 可访问性 | 涉及首屏、提问帮助及消息结构化内容的 axe 检查通过；减少动态效果下三问动画为 `none` |
| 视觉 | 1440×900 加载态、1100×720 和 1920×1080 就绪态、紧凑失败态人工检查通过；无横向溢出，输入框可达 |
| `npm run build` | PASS；Vite 有大 chunk 提示，本轮不包含拆包优化 |
| 现有预览 | 4173 服务可用；`/api/teachbuddy/health` 返回 `ready`；当前真实班级页面保留历史与已发消息，顶部已显示新更新状态，旧说明行已移除 |

首次全量 Vitest 与多组浏览器/静态检查并行时，有 8 项原有集成用例触发 5 秒超时，无断言不匹配。结束其他测试并限制为 2 个 worker 后，全部 1,046 项通过；为处理这 8 项超时，没有修改这些用例的断言或放宽超时。该现象与并发负载相关，但本轮不作机器性能根因结论。

浏览器新增状态验证使用隔离的 UI 契约 fixture；不改用户的真实业务记录，不清空用户的历史，不声称重新完成真实业务 API 或模型答案质量验收。已有真实页面仅只读核验。

# 早期本地视觉证据

- [历史收起时三问](../../../../.runtime/entry-history-visual-check/e2e-classin-messages-hybri-584e7-en-history-is-revealed-a11y-chromium/entry-history-collapsed.png)
- [展开历史后三问退出](../../../../.runtime/entry-history-visual-check/e2e-classin-messages-hybri-584e7-en-history-is-revealed-a11y-chromium/entry-history-revealed.png)
- [加载与三问](../../../../.runtime/entry-loading-playwright/e2e-classin-messages-hybri-3deb8-r-for-restored-history-a11y-chromium/entry-loading-1440.png)
- [窄侧栏](../../../../.runtime/entry-loading-playwright/e2e-classin-messages-hybri-3deb8-r-for-restored-history-a11y-chromium/entry-ready-1100.png)
- [宽屏](../../../../.runtime/entry-loading-playwright/e2e-classin-messages-hybri-3deb8-r-for-restored-history-a11y-chromium/entry-ready-1920.png)
- [持续失败](../../../../.runtime/entry-loading-playwright/e2e-classin-messages-hybri-ef85f-questions-or-auto-expanding-chromium/entry-unavailable.png)

这些是本机忽略目录中的测试截图，不是用户真实课堂数据或永久发布资产。

# 用户体验验收

刷新或重新进入班级页面：推荐加载较慢时看到新开场及三问；当前展开阶段有可操作建议后，三问淡出，鼠标/键盘正在操作时暂缓。快速加载可直接呈现卡片。顶部折叠、失败、空或仅供查看时保留三问；展开历史或提交新问题仍优先收起。无需删除历史或创建新 Session。
