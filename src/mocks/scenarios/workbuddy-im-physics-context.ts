import type { BusinessContextItem } from '@contracts/workbuddy/business-context';

type FixedTeachingFact = Readonly<{
  key: string;
  label: string;
  value: string;
  sensitivity?: BusinessContextItem['sensitivity'];
}>;

type FixedTeachingEntity = Readonly<{
  ref: string;
  kind: 'class' | 'plan' | 'course' | 'lesson' | 'attendance' | 'assignment' | 'quiz' | 'wrong-question-set' | 'period' | 'student';
  relatedRefs: readonly string[];
  facts: readonly FixedTeachingFact[];
}>;

export type FixedImTeachingContext = Readonly<{
  version: string;
  capturedAt: string;
  classRef: string;
  entities: readonly FixedTeachingEntity[];
}>;

const fact = (key: string, label: string, value: string, sensitivity: BusinessContextItem['sensitivity'] = 'standard'): FixedTeachingFact =>
  Object.freeze({ key, label, value, sensitivity });

const entity = (
  ref: string,
  kind: FixedTeachingEntity['kind'],
  relatedRefs: readonly string[],
  facts: readonly FixedTeachingFact[],
): FixedTeachingEntity => Object.freeze({ ref, kind, relatedRefs: Object.freeze([...relatedRefs]), facts: Object.freeze([...facts]) });

/**
 * Repository-safe, resettable teaching fixture for the IM Copilot demo.
 * Every person, time, score and learning record below is synthetic.
 */
export const PHYSICS_IM_TEACHING_CONTEXT: FixedImTeachingContext = Object.freeze({
  version: 'physics-im-context-2026-08-09-v2',
  capturedAt: '2026-08-09T14:40:00+08:00',
  classRef: 'physics-3',
  entities: Object.freeze([
    entity('physics-3', 'class', [], [
      fact('class-profile', '班级', '高二物理 3 班；星河学习中心；任课教师王老师；班级群与三门物理课程共用；在班学生 30 人。'),
      fact('context-clock', '当前演示时间', '2026年8月9日 14:40（北京时间）；以下课程、课堂、作业和学情均为固定伪真实数据，可重置。'),
      fact('communication-style', '班级沟通要求', '面向学生和家长使用简洁、尊重、不责备的语气；先说当前事实，再说下一步与时间；不要要求不必要的回执。'),
    ]),
    entity('plan-physics-2026-summer', 'plan', ['physics-momentum', 'physics-wave', 'physics-induction'], [
      fact('plan-progress', '整体学习计划', '高二物理暑期衔接共 12 讲：已完成 8 讲，正在进行第 9 讲，后续还有 3 讲；对外可概括为“已学 8 讲，还剩 4 讲”。'),
      fact('plan-position', '当前学习位置', '机械波基础已经学完；动量守恒学到碰撞模型；下一阶段进入电磁感应，随后学习楞次定律和综合应用。'),
      fact('plan-next', '后续安排', '8月10日19:00电磁感应导入；8月12日19:00楞次定律；8月14日19:00电磁感应综合应用；8月16日15:00阶段复习与测评。'),
    ]),
    entity('physics-momentum', 'course', ['plan-physics-2026-summer', 'lesson-momentum-0809', 'homework-momentum-a', 'quiz-momentum-check'], [
      fact('course-name', '课程', '动量守恒与碰撞模型；所属班级：高二物理 3 班；当前进度：第 4 讲，共 5 讲。'),
      fact('course-goal', '课程目标', '能判断动量守恒条件，正确选择研究系统和正方向，并用一维动量守恒方程计算碰后速度。'),
    ]),
    entity('lesson-momentum-0809', 'lesson', ['physics-momentum', 'attendance-momentum-0809', 'homework-momentum-a', 'quiz-momentum-check'], [
      fact('lesson-schedule', '当前课次', '动量守恒模型；2026年8月9日 14:30—15:20；在线课堂；当前已上课 10 分钟。'),
      fact('lesson-outline', '本讲知识点', '①守恒条件与研究系统；②正方向约定；③速度的正负号；④完全弹性与非弹性碰撞；⑤用动量守恒式求碰后速度。'),
      fact('lesson-flow', '课堂活动', '碰撞实验回放5分钟；方向判断热身题2道；例题讲解2道；分组练习3道；随堂测验10题；最后3分钟布置课后任务。'),
      fact('lesson-materials', '课堂材料', '《动量守恒模型》讲义第12—18页、碰撞实验回放、课堂练习单A组、随堂测验。'),
    ]),
    entity('attendance-momentum-0809', 'attendance', ['physics-momentum', 'lesson-momentum-0809'], [
      fact('attendance-status', '当前到课', '应到 30 人，已进入 27 人，未进入 3 人，无已批准请假；数据时间为14:40。'),
      fact('attendance-students', '未进入学生', '李明、周然、陈晨尚未进入课堂。', 'student-personal'),
      fact('attendance-action', '到课提醒边界', '只提醒尽快进入课堂并说明正在讲解的内容；如有设备或网络问题可联系老师，不使用“迟到”“缺勤”等责备性判断。'),
    ]),
    entity('homework-momentum-a', 'assignment', ['physics-momentum', 'lesson-momentum-0809'], [
      fact('homework-profile', '作业', '动量守恒作业 A 组；共 8 题：4题基础判断、3题一维碰撞计算、1题实验数据分析；2026年8月10日 18:00 截止。'),
      fact('homework-status', '作业提交', '应交 30 人，已交 24 人，未交 6 人；当前尚未截止。'),
      fact('homework-missing', '未交学生', '李明、周然、陈晨、王小明、张然、赵可。', 'student-personal'),
      fact('homework-requirement', '完成要求', '在 ClassIn 提交完整计算过程；第5题必须画方向示意图并标出速度正负号；有困难可先提交已完成部分并留言。'),
    ]),
    entity('quiz-momentum-check', 'quiz', ['physics-momentum', 'lesson-momentum-0809'], [
      fact('quiz-profile', '测验', '动量守恒随堂测验；10道单选题，预计8分钟；2026年8月9日 21:00 截止。'),
      fact('quiz-status', '测验提交', '应交 30 人，已交 25 人，未交 5 人；当前尚未截止。'),
      fact('quiz-missing', '未交学生', '周然、陈晨、王小明、张然、赵可。', 'student-personal'),
      fact('quiz-focus', '测验范围', '动量守恒条件、研究系统选择、正方向约定、速度正负号和一维碰撞计算。'),
    ]),
    entity('physics-wave', 'course', ['plan-physics-2026-summer', 'lesson-wave-0808', 'task-plan-wave-0808', 'wrong-question-set-physics-recent'], [
      fact('course-name', '课程', '机械波基础；所属班级：高二物理 3 班；当前状态：已完成本单元最后一讲。'),
      fact('course-goal', '课程目标', '理解机械波的产生与传播，区分横波与纵波，掌握波速、频率、波长的关系及适用条件。'),
    ]),
    entity('lesson-wave-0808', 'lesson', ['physics-wave', 'task-plan-wave-0808', 'wrong-question-set-physics-recent'], [
      fact('lesson-schedule', '已结束课次', '机械波基础；2026年8月8日 19:00—19:50；在线课堂；30人全部到课。'),
      fact('lesson-outline', '本讲知识点', '①机械波产生条件；②横波与纵波；③波速由介质决定；④频率由波源决定；⑤同一介质中用 v=fλ 判断频率与波长变化。'),
      fact('lesson-practice', '课堂练习', '绳波观察实验；横波纵波辨析2题；同一绳上频率变化计算题2题；出口题1道。第3题是“频率由5Hz增至10Hz，原波长2m，求新波长”。'),
      fact('lesson-performance', '课堂表现', '概念辨析正确率 87%；计算题正确率 73%；主要问题是忽略“介质不变，所以波速不变”的前提。'),
    ]),
    entity('task-plan-wave-0808', 'assignment', ['physics-wave', 'lesson-wave-0808'], [
      fact('task-overview', '课后任务', '本讲共安排 3 份作业和 1 次测验。'),
      fact('task-1', '作业一', '《机械波概念图》：整理产生条件、类型和三个物理量；8月10日 18:00 截止。'),
      fact('task-2', '作业二', '教材第67页第2—4题：完成计算过程并写出公式适用条件；8月10日 18:00 截止。'),
      fact('task-3', '作业三', '《机械波错题订正》：订正课堂练习第3、4题；8月12日 18:00 截止。'),
      fact('task-quiz', '课后测验', '《机械波基础检测》10题，限时12分钟；8月9日 21:00 截止。'),
    ]),
    entity('wrong-question-set-physics-recent', 'wrong-question-set', ['physics-wave', 'physics-momentum', 'homework-momentum-a'], [
      fact('wrong-summary', '错题概况', '最近2次作业中，李明、周然、陈晨、王小明、张然5位同学在7道题上出现集中错误。', 'student-personal'),
      fact('wrong-1', '错题1', '动量A组第2题：系统选择；典型错误是只选一辆小车；解析重点是先判断相互作用发生在哪些物体之间。'),
      fact('wrong-2', '错题2', '动量A组第3题：守恒条件；典型错误是把合外力不为零直接判为不守恒；解析重点是看碰撞过程外力冲量能否忽略。'),
      fact('wrong-3', '错题3', '动量A组第5题：1kg小车4m/s向右碰撞静止小车，碰后第一辆1m/s向左；正确列式4=-1+v，v=5m/s向右。'),
      fact('wrong-4', '错题4', '动量A组第7题：完全非弹性碰撞；典型错误是碰后仍分别设速度；解析重点是两物体粘连后速度相同。'),
      fact('wrong-5', '错题5', '机械波第1题：波源停止后传播；典型错误是认为波立即消失；解析重点是已形成的波继续在介质中传播。'),
      fact('wrong-6', '错题6', '机械波第3题：同一绳上频率从5Hz增至10Hz；波速10m/s不变，新波长1m；典型错误是把波速也加倍。'),
      fact('wrong-7', '错题7', '机械波第4题：横波与纵波；典型错误是按传播方向判断；解析重点是比较质点振动方向与波传播方向。'),
      fact('card-format', '错题卡格式', '每题正面放精简题面和“先想一步”；背面放典型错因、分步解析、答案和一道不重复原题的再练题。'),
    ]),
    entity('physics-induction', 'course', ['plan-physics-2026-summer', 'lesson-induction-0810'], [
      fact('course-name', '课程', '电磁感应；所属班级：高二物理 3 班；当前状态：尚未开始。'),
      fact('course-goal', '课程目标', '认识磁通量，能从磁通量变化判断是否产生感应电流，为后续法拉第电磁感应定律和楞次定律建立基础。'),
    ]),
    entity('lesson-induction-0810', 'lesson', ['physics-induction'], [
      fact('lesson-schedule', '下次课次', '电磁感应导入；2026年8月10日 19:00—19:50；在线课堂；面向全班30人。'),
      fact('lesson-preview', '课前准备', '预习讲义第1—4页；观看2分钟“磁铁穿过线圈”实验视频；完成预习单前3题；准备纸笔和直尺。'),
      fact('lesson-materials', '已发材料', '《电磁感应导入》讲义、实验短视频、预习单均已放入班级空间。'),
    ]),
    entity('period-this-week', 'period', ['physics-wave', 'physics-momentum', 'physics-induction'], [
      fact('period-range', '学情周期', '2026年8月3日—8月9日；覆盖机械波、动量守恒和电磁感应预习三门课程。'),
      fact('class-progress', '整班进展', '计划12讲已完成8讲；机械波单元已完成，动量守恒进入碰撞模型，电磁感应材料已发。'),
      fact('class-performance', '整班表现', '最近两次课堂平均到课率96.7%；课堂练习平均正确率81%；已截止任务按时提交率88%。'),
      fact('class-strength', '共性优势', '多数学生能识别基本模型并列出公式；实验回放和方向示意图能明显帮助理解。'),
      fact('class-risk', '共性问题', '5位同学集中出现速度正负号、研究系统选择和“介质不变时波速不变”三个问题。'),
      fact('class-next', '下一步建议', '先用错题卡完成机械波与碰撞模型复盘，再进入电磁感应；下次课前检查预习单前3题。'),
    ]),
    entity('student-001', 'student', ['period-this-week', 'physics-momentum', 'physics-wave'], [
      fact('student-profile', '学生', '李明；高二物理 3 班；当前可通过私聊联系。', 'student-personal'),
      fact('student-class', '课堂表现', '能识别动量守恒条件并列式；速度方向判断从多次修改进步为看图后可自查；主动提问3次。', 'student-personal'),
      fact('student-homework', '作业表现', '碰撞模型总结92分；单元任务完成4/5；机械波订正被退回1次；当前动量守恒A组尚未提交。', 'student-personal'),
      fact('student-focus', '个人关注', '列式前先画方向箭头；写出“介质不变→波速不变”；完成一道同类题后用一句话解释判断依据。', 'student-personal'),
    ]),
  ]),
});

function inferredContextRefs(query: string | undefined): readonly string[] {
  const value = query?.trim() ?? '';
  const refs = new Set<string>();
  if (/计划|进度|学了|后续|课程.*时间|接下来.*课/u.test(value)) refs.add('plan-physics-2026-summer');
  if (/动量|碰撞|当前.*课|进入课堂|到课/u.test(value)) {
    refs.add('physics-momentum'); refs.add('lesson-momentum-0809');
  }
  if (/进入课堂|到课/u.test(value)) refs.add('attendance-momentum-0809');
  if (/动量.*作业|作业\s*A|交作业|未交作业/u.test(value)) refs.add('homework-momentum-a');
  if (/测验/u.test(value)) refs.add('quiz-momentum-check');
  if (/机械波|本讲回顾|课堂回顾/u.test(value)) {
    refs.add('physics-wave'); refs.add('lesson-wave-0808');
  }
  if (/课后任务|学习任务|3\s*份作业/u.test(value)) refs.add('task-plan-wave-0808');
  if (/错题|错因|错题卡|闪卡/u.test(value)) refs.add('wrong-question-set-physics-recent');
  if (/整班|本班.*学情|阶段学情|共性/u.test(value)) {
    refs.add('period-this-week'); refs.add('plan-physics-2026-summer');
  }
  if (/李明|个人学情/u.test(value)) refs.add('student-001');
  if (/电磁|预习|明天.*开课|提醒上课/u.test(value)) {
    refs.add('physics-induction'); refs.add('lesson-induction-0810');
  }
  return refs.size ? Object.freeze([...refs]) : Object.freeze(['plan-physics-2026-summer']);
}

export function physicsImTeachingContextItems(
  sourceRef: string,
  focusRefs: readonly string[] = [],
  query?: string,
): readonly BusinessContextItem[] {
  const selectedRefs = new Set(focusRefs.length ? focusRefs : inferredContextRefs(query));
  const selectedEntities = PHYSICS_IM_TEACHING_CONTEXT.entities.filter(({ ref, kind }) => kind === 'class' || selectedRefs.has(ref));
  return Object.freeze(selectedEntities.flatMap((record) => record.facts.map((recordFact) => Object.freeze({
    key: `${record.ref}:${recordFact.key}`,
    label: recordFact.label,
    value: recordFact.value,
    sourceRef,
    sensitivity: recordFact.sensitivity ?? 'standard',
  }))));
}
