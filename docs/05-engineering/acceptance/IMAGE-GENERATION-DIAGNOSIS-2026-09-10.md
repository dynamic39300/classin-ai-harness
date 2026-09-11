# 解题过程图片请求诊断

用户请求把解题过程生成16:9图片，界面显示“已停止·0s”。只读检查会话最后回合：Gemini company-gateway/tokenhub/gemini-3.5-flash 已被调用，约25秒后返回 stopReason=length，Harness turn/end=max-tokens，未产生可展示输出。不是凭据失效或未路由到Gemini；内部思考是否耗尽预算不能仅凭返回的outputTokens=0确定。

现有能力只有 text/image输入的聊天模型和 create_teaching_draft 文稿工具，未接入图片生成工具、图片产物展示及其存储链路。公司目录中的foundry/gpt-image-2虽可列出，但尚未实测/集成，不应声明可用。识图验收不涵盖生成图片。

展示问题：事件投影把max-tokens与aborted/interrupted合并为stopped，界面0s并非实际耗时，容易误导。后续需分别修复输出上限提示/计时，以及接入独立图片生成或确定性解题图渲染能力。本次仅诊断，未扩大到图片生成实现，也未改动模型或凭据。
