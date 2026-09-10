# TeachBuddy IM 四项个性化学情服务 Ticket 拆分

状态：`READY_FOR_IMPLEMENTATION`
父规格：`PERSONALIZED-LEARNING-SERVICES-FEATURE-SPEC.md`

| Ticket | 纵向结果 | Write Set | 依赖 | 完成定义 |
| --- | --- | --- | --- | --- |
| IM-PLS-01 | 群聊/1v1 可读取受治理目录并选择学生、课次、任务、错题和周期 | `src/contracts/workbuddy/business-context.ts`、`src/domain/workbuddy/personalized-learning-service*`、`src/mocks/scenarios/workbuddy-im-learning-evidence.ts`、Adapter 与测试 | 无 | 两渠道目录、选择校验、Snapshot 来源/版本/真值和错误 ref 测试通过 |
| IM-PLS-02 | 个性化提醒可由真实 DeepSeek 生成并进入群待审或单人私聊 Composer | Sidecar Surface/CSS、Domain 请求/解析、组件测试 | IM-PLS-01 | 原因/对象可选，Artifact 可编辑，多人群发经过审批，单人不自动发送 |
| IM-PLS-03 | 个性化课堂回顾可选择课次/学生并安全转入 1v1 | 同上及 Workspace Composer 路由 | IM-PLS-01 | 三段式回顾真实生成；群发起后切换准确私聊并插入 |
| IM-PLS-04 | 错题解析与再练可选择错题并生成解释/新练习 | 同上 | IM-PLS-01 | 原题证据不由页面拼装；解释与练习可编辑并只进目标 1v1 |
| IM-PLS-05 | 个人学情总结可选择周期并生成进展/困难/建议 | 同上 | IM-PLS-01 | 不产生正式诊断或长期标签；产物可编辑并只进目标 1v1 |
| IM-PLS-06 | 完成状态、隐私、真实 Runtime、响应式与数据真值验收 | tests、验收记录、README/Traceability | IM-PLS-02..05 | Build/契约/浏览器通过；四项真实 DeepSeek 路径留证；DW 行级缺口不伪造 |

Tickets 以可演示纵向结果收口，不建立只有“加字段”或“写 CSS”的水平票。共享 Module 在 IM-PLS-01 深化，后续票只扩展能力配置和端到端体验。
