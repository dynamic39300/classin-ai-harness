# 解题过程图交付验收

实现：create_solution_image 输出受限结构化JSON草稿，既有Artifact/文件库保存源；PNG endpoint按scope/session/artifact校验并确定性排版为1600×900。共享预览用于IM及主工作台，支持加载/失败重试、打开大图、下载PNG。用户无需新增API Key；本机Chrome为渲染依赖。没有图片绘画模型调用、真实ClassIn发布或自动发送。

真实证据：Gemini company-gateway/tokenhub/gemini-3.5-flash 按函数题三步解析调用新工具，约10秒后返回完成，草稿call_375679持久保存。PNG接口HTTP200，Content-Type image/png，实际尺寸1600×900，下载Content-Disposition attachment；跨scope返回404。浏览器主工作台打开草稿后显示真实图片与可用下载按钮。导出图已目视检查：三列说明、分行公式、结论、来源提示均完整无截断。

实现过程中发现模型将LaTeX命令双重转义、长等式一行撑宽，模板保守归一化命令并将多重等号分行，仍不改变数学关系。字体嵌入PNG排版环境、拒绝脚本与外网；图片超过排版预算明确报错。max-tokens现在显示长度限制失败，不冒充用户停止。

范围限制：第一版仅文字与公式步骤图，2–4步/一页；不支持精确函数曲线、任意示意绘画、自动多页及班群图片发布。原数据以JSON保留，可重新生成PNG；PNG是派生本机导出。源上限是排版预算，超限需要精简。后续模型输出仍需教师核对题意和结论。

最终验收：原用户会话再次以普通中文请求“把上面的函数图像题解题过程生成16:9 PNG”，Gemini完成create_solution_image并返回idle，产物call_1150287《三角函数与绝对值变换判定》PNG接口200。无需显式说工具名。15项Harness测试、58项相关Vitest测试、TypeScript、ESLint、1440×900浏览器创建/恢复/审阅/保存下载回归通过。新增Playwright运行依赖与现有测试依赖对齐1.62.1，避免双版本测试启动冲突。
