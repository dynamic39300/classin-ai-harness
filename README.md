# ClassIn AI Harness

本目录是从 ClassIn TeachBuddy M4.5 封版代码分离出的独立 Harness 工作区。DeepSeek Harness 以固定 Git submodule 接入，产品侧仍通过可替换 Runtime Adapter 与其隔离。

接入边界和本地启动方式见 [DeepSeek Harness 接入边界](./docs/06-architecture/DEEPSEEK-HARNESS-INTEGRATION.md)。

线上演示的 Docker 封装、运行时密钥配置和模拟数据范围见 [TeachBuddy 线上演示部署](./docs/05-engineering/ONLINE-DEMO-DEPLOYMENT.md)。

这是 ClassIn PC 教师/学生产品基座与教师 AI 教学搭档 **ClassIn TeachBuddy** 的统一设计、研究和实现仓库。产品界面简称 **TeachBuddy**；内部工程标识继续使用 `workbuddy`，既有 `WorkBuddyRun`、路由和存储键不随品牌展示名迁移。当前代码保留既有 ClassIn PC Demo 的完整业务背景，并在教师端增加 AI Agent 工作台；首条纵向切片是“课程目标到课程对象”。

## 当前入口

- Agent 规范：[AGENTS.md](./AGENTS.md)
- 项目简报：[docs/00-project/PROJECT-BRIEF.md](./docs/00-project/PROJECT-BRIEF.md)
- 决策台账：[docs/00-project/DECISION-LEDGER.md](./docs/00-project/DECISION-LEDGER.md)
- ClassIn PC 产品基座迁移方案：[docs/00-project/CLASSIN-PC-FOUNDATION-MIGRATION-PLAN.md](./docs/00-project/CLASSIN-PC-FOUNDATION-MIGRATION-PLAN.md)
- 目录与工程规范：[docs/05-engineering/PROJECT-STRUCTURE.md](./docs/05-engineering/PROJECT-STRUCTURE.md)
- 原型设计规范：[docs/03-design/PROTOTYPE-DESIGN-STANDARDS.md](./docs/03-design/PROTOTYPE-DESIGN-STANDARDS.md)
- 首条纵向切片 Spec：[docs/04-specs/features/course-production/SPEC.md](./docs/04-specs/features/course-production/SPEC.md)
- TeachBuddy V1 规格（目录保留内部工程标识）：[docs/04-specs/features/workbuddy-v1-workspace/](./docs/04-specs/features/workbuddy-v1-workspace/)

## 运行工作台

使用 Node.js 22.19+ 或 24+，按 lockfile 安装并启动。此机器的启动器可自动使用已安装的 Codex Node 24：

```bash
npm ci
npm run dev
```

`npm run dev` 同时启动前端/BFF（通常 `http://127.0.0.1:4173/`）和专用 DeepSeek Harness（`http://127.0.0.1:3080/`）。先选择教师视角，再进入 TeachBuddy。原确定性课程任务从“课程工作流”进入。

模型凭据只在项目根目录未提交的 `.env` 中配置，字段见 [.env.example](./.env.example)。修改后重启 `npm run dev`。没有凭据时页面会明确提示，不能发送真实模型请求。请勿在 `VITE_*` 变量中配置密钥。

真实运行入口支持持续文本对话、教学文稿生成、停止、会话恢复、审阅保存和 Markdown 下载。ClassIn 业务数据仍为固定 Demo；保存只进入本机 `.runtime/`，不代表正式发布。运行时、历史与产物按教师 Product Profile 隔离，均不提交 Git。

详细范围与验收见 [运行时 Spec](./docs/04-specs/features/teachbuddy-agent-runtime/README.md)。`npm run dev:ui` 仅启动前端/BFF；`npm run harness:teachbuddy` 单独启动专用运行时。

常用质量命令：

```bash
npm run check
npm run build
npm run test:e2e
npm run test:visual
```

## 证据与历史文档

- 一手研究与证据：[docs/01-research/](./docs/01-research/)
- 阶段产出、过程记录与历史会话：[docs/07-history/](./docs/07-history/)

历史原稿保留原文，只作思想过程和来源追溯。当前可执行的结论以 `docs/00-project/`、`docs/02-product/`、`docs/04-specs/` 和 `docs/06-architecture/` 为准。
