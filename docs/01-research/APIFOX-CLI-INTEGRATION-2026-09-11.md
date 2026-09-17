# Apifox CLI 接入与 ClassIn 接口对照研究

研究日期：2026-09-11。状态：**已连接公司私有部署，已完成首轮目录匹配**。此前未登录及令牌失败记录作为历史保留；最新结果见 [首轮对应报告](./APIFOX-CLASSIN-FIRST-MATCH-2026-09-11.md)。

## 目的与范围

读取公司 Apifox 中可访问的项目、接口定义、参数、响应和数据模型，补充 [ClassIn PC 静态扫描](./CLASSIN-PC-API-SCAN-2026-09-11.md) 的 350 条候选。Write Set 为本研究文档；不修改产品、Spec、Adapter 或锁定决策，不执行业务测试、导入或远端写入。本报告包含官方能力研究与本机安装/登录状态核对。

用户给出的 [Apifox CLI 链接](https://docs.apifox.com/apifox-cli) 是 Apifox 产品帮助文档，**不是公司的项目地址或 Swagger/OpenAPI 导出链接**。仅凭这个网址无法定位公司的业务系统。

## 可以接入什么

新版 CLI 支持查询项目内的 API、参数、响应、模型等资源，并支持 API 数据导出。前提是 Apifox 账号有目标项目权限，且 CLI 完成 API 访问令牌认证。[官方 AI Agent 使用说明](https://docs.apifox.com/9212297m0)

官方安装引导给出以下可直接核对的基础命令：[首次安装引导](https://apifox.com/apifox-cli-installation-guide.md)

```bash
apifox --version
apifox --help
apifox whoami
apifox project list
apifox environment list --project <PROJECT_ID>
```

`project list` 用于发现当前账号可访问的项目；不能将其视为公司全部业务系统清单。项目是否对应某个业务系统，还需核对项目名称、目录、服务地址和维护说明。

接口/模型资源命令的具体参数以当前 CLI `--help` 和结构化输出为准，不根据旧版测试 CLI 的说明猜测。官方总入口也明确以 CLI 帮助为事实来源，提供 `--project`、`--branch` 和私有部署地址 `--api-base-url` 参数。[官方 CLI Skill](https://apifox.com/.well-known/agent-skills/apifox-cli/SKILL.md)

## 认证前提

API 访问令牌从 Apifox「用户头像 → 账号设置 → API 访问令牌」创建；官方登录形式为 `apifox login --with-token <TOKEN>`，登录后用 `whoami` 验证，再读项目列表。Token 不进入聊天、仓库或普通日志。[首次安装引导](https://apifox.com/apifox-cli-installation-guide.md)

官方 CLI Skill 说明凭据保存在用户目录 `~/.apifox/config.toml`；私有部署需要正确服务地址。研究阶段未读取此文件、未读取任何凭据。[官方 CLI Skill](https://apifox.com/.well-known/agent-skills/apifox-cli/SKILL.md)

**Apifox 文档访问权限与 ClassIn 教师业务权限是两套权限。** 即使可以读取接口说明，也仍需使用 ClassIn 的鉴权机制和测试教师权限调用业务接口。反过来，ClassIn 的 UID/secret 不会自动变成 Apifox 的访问令牌。这是由两个系统分别认证及本仓库 ClassIn 鉴权上下文得出的接入边界，不代表已经完成业务鉴权。

## 导出与匹配方法

官方支持 OpenAPI 等格式导出；具体选项先查 `apifox export --help`。原生格式文档给出以下示例：[官方导入导出 Skill](https://apifox.com/.well-known/agent-skills/apifox-import-export/SKILL.md)

```bash
apifox export --project <PROJECT_ID> --format apifox --output <LOCAL_OUTPUT_PATH>
```

原生导出默认可能包含调试和用例内容。只需要接口定义时可核对 `--no-include-api-cases` 选项。导出到本地不等于可以直接把原始文件提交到仓库；应先检查示例与描述是否含账号、密钥或个人数据。[官方导入导出 Skill](https://apifox.com/.well-known/agent-skills/apifox-import-export/SKILL.md)

取得授权文档后，按以下口径对照：

1. 保留 Apifox 项目、分支、模块、接口 ID、方法、路径、服务地址和采集时间。
2. 用 HTTP 方法 + 归一化路径匹配静态清单，同时保存原始路径；仅在有依据时处理服务前缀、模板参数和环境主机差异。
3. 区分精确匹配、可能匹配、多候选、仅前端发现和仅文档发现，避免用路径尾部相同强行合并。
4. 对匹配项补充请求字段、必填条件、响应 Schema、错误码、角色与业务说明。缺失说明继续标为未知。
5. 优先核对班级列表、学生名单、课程/单元活动、作业详情与逐人提交/批阅链路。

匹配成功只证明“前端调用与注册文档对应”。教师可调用、数据完整性、分页边界、任课/班主任范围以及生产可用性仍需要独立验证。静态清单中的 POST 大量用于查询，不能仅凭 HTTP 方法决定业务副作用。[现有扫描口径](./CLASSIN-PC-API-SCAN-2026-09-11.md)

## 本轮验证边界

- 已读取官方安装引导、AI Agent 使用文档、CLI 和导入导出 Skill。
- 尚无公司项目清单或 Swagger/OpenAPI 内容，因此未计算接口匹配率。
- 本机已安装 Apifox CLI 2.2.9；团队/项目/接口列表、接口详情与 OpenAPI 导出参数已通过实际 CLI help 核对。模型命令存在，尚未读取模型。
- 若未登录，后续最小输入是用户在本机完成 Apifox Token 登录；若采用文档导出路线，则需要实际公司项目的 Swagger/OpenAPI 文件或有权限访问的导出链接。

## 本机接入状态与已核对命令

- 使用 npm 官方源全局安装 `apifox-cli`，`apifox --version` 返回 `2.2.9`；未更改应用 package.json/package-lock。
- 通过 skill-installer 安装官方 `apifox-cli`、`apifox-import-export` 到用户级 skills 目录，并阅读两份 SKILL.md。
- `apifox whoami` 返回 `success:false`、`尚未登录`；不能声称已连接公司项目。
- `apifox login` 已确认出现交互式 Token 输入提示；未输入凭据，以 Ctrl-C 退出。用户可在本机终端完成登录，不必将 Token 发到聊天中。
- 公有云/私有部署仍待用户确认；未写默认项目配置。

以下来自 CLI 2.2.9 的实际 `--help`，尖括号均为待真实发现的值：

```bash
apifox login
apifox whoami
apifox team list
apifox project list
apifox project list --team <TEAM_ID>
apifox endpoint list --project <PROJECT_ID> --page 1 --page-size 500
apifox endpoint list --project <PROJECT_ID> --path-contains course_list
apifox endpoint get <ENDPOINT_ID> --project <PROJECT_ID>
apifox export --project <PROJECT_ID> --format openapi --oas-version 3.0 --include-extension-properties --output <LOCAL_OUTPUT_PATH>
```

接口列表不传分页参数时默认全量；使用分页时必须继续取完，不能把首批 500 项当全部。项目/接口/模型属于文档读取；本次不执行 `run`，不导入或修改远端资源。接入完成后才可统计350条静态候选的精确/可能/未匹配情况。

### 用户提供令牌后的登录尝试

用户授权使用提供的 API 访问令牌登录。通过 CLI 默认服务执行一次登录，返回 `success:false`、`错误: 无效的访问令牌。`，退出码 1。未成功连接账号，未读取团队、项目或公司接口；令牌值不写入本研究记录。需确认令牌复制是否完整、有效，以及是否需要公司私有部署的 API 基础地址；目前无法从该错误单独判断原因。

用户再次提供重置后的令牌，按授权重新登录一次，仍返回相同“无效的访问令牌”，退出码 1。没有执行全局配置清理或退出其他账号。检查本机 CLI 2.2.9 实现发现，该错误文本用于映射服务端 `errorCode` 以 `401` 开头的鉴权错误；目前不应继续归因于本地 Token 格式或要求用户反复重置。下一步优先确认公司实际 Apifox 服务网址/是否私有部署，再核对令牌作用域。新旧令牌均未写入研究文件。
