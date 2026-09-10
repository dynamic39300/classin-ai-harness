# TeachBuddy 线上演示部署

## 1. 部署范围

该部署包用于受控的产品演示环境。一个容器同时提供：

- ClassIn PC 教师端 Web 页面与构建后的前端资源；
- 同源 `/api/teachbuddy/*` 服务端 BFF；
- 仅监听容器回环地址 `127.0.0.1:3080` 的 DeepSeek Harness；
- `src/mocks/scenarios/` 和 `public/` 中的固定、脱敏、可重置模拟数据与媒体。

浏览器只访问平台分配的 HTTPS 地址。DeepSeek API Key 只存在于容器运行环境，不能写入源码、Dockerfile、构建参数、`VITE_*` 变量或上传包。

## 2. 平台配置

选择支持 Dockerfile 的 Node 容器平台，使用仓库根目录作为构建上下文。平台需要：

- 构建命令：使用根目录 `Dockerfile`；
- 服务端口：读取 `PORT`，默认 `4173`；
- 必填运行时环境变量：`DEEPSEEK_API_KEY`；
- 可选运行时环境变量：`DEEPSEEK_BASE_URL`，默认使用 DeepSeek 官方兼容地址；
- 可选持久卷：挂载到 `/app/.runtime`，用于保留 Harness 会话和产物。无持久卷时，服务重启后这些运行态数据会清空，页面中的固定模拟业务数据不受影响。

在平台的 Secret 或 Environment Variables 设置中录入 Key。不要上传本机 `.env`，也不要把 Key 放在公开地址的查询参数或前端配置中。

容器启动命令已经写入镜像：

```bash
npm start
```

启动后，平台健康检查可访问：

```text
/api/teachbuddy/health
```

## 3. Docker 验证

有 Docker 的机器可在仓库根目录运行：

```bash
docker build -t classin-teachbuddy-demo .
docker run --rm \
  -p 4173:4173 \
  -e DEEPSEEK_API_KEY='由部署平台注入的密钥' \
  -v classin-teachbuddy-runtime:/app/.runtime \
  classin-teachbuddy-demo
```

然后访问：

```text
http://127.0.0.1:4173/teacher/messages?category=class&thread=class-physics-3
```

## 4. 线上演示边界

当前页面和 AI 上下文使用固定模拟业务数据，适合产品体验和交互验收。Harness 会话存储仍是单服务运行态，不提供生产多租户隔离。公开演示地址应使用平台访问控制和请求限流，避免未授权调用消耗模型额度。

真正接入 ClassIn 业务接口时，保持页面和 BFF 接口不变，把模拟 Adapter 替换为经过鉴权的真实业务 Adapter，并补齐用户身份、租户隔离、审计、配额和持久化能力。
