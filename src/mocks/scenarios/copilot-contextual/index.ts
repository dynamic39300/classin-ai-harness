import fixture from './pack.json'
import type {
  CopilotScenarioId, CopilotScenarioOptions, CopilotScenarioPack, CopilotScenarioView,
  ScenarioAction, ScenarioHomework, ScenarioStudent,
} from './types'

export type * from './types'

// Fixed generated input is verified by build_pack.py and projection contract tests.
const pack = fixture as CopilotScenarioPack
export const copilotScenarioVersion = pack.version
export const copilotScenarioCheckpoints = Object.freeze({ ...pack.checkpoints })

/** Pure, resettable projection: only this result (never the full pack/inventory) goes to UI or Agent. */
function projectCourseScenario(
  scenarioId: CopilotScenarioId,
  options: CopilotScenarioOptions = {},
): CopilotScenarioView {
  if (!(scenarioId in pack.checkpoints)) throw new Error('Unknown Copilot scenario')
  const now = options.at ?? pack.checkpoints[scenarioId]
  const nowMs = Date.parse(now)
  if (!Number.isFinite(nowMs)) throw new Error('Scenario clock must be an ISO timestamp')
  const classRoom = pack.classes.find(item => item.id === (options.classId ?? 'copilot-class-a'))
  if (!classRoom) throw new Error('Unknown Copilot class')
  const courses = pack.courses.filter(item => item.classId === classRoom.id)
  const course = courses.find(item => item.id === options.courseId) ?? (options.courseId ? undefined : courses[0])
  if (!course) throw new Error('Course does not belong to the selected class')
  const failure = options.failure ?? (scenarioId === 'S8' ? 'unknown' : undefined)
  const students = pack.students.filter(item => classRoom.studentIds.includes(item.id))
  const byId = new Map(students.map(item => [item.id, item]))
  const studentList = (ids: string[]): ScenarioStudent[] => ids.flatMap(id => {
    const student = byId.get(id)
    return student ? [student] : []
  })
  const visibleEvents = failure ? [] : pack.events.filter(event => event.classId === classRoom.id && event.courseId === course.id && Date.parse(event.at) <= nowMs)
  const recapMaterials = failure ? [] : pack.recapMaterials.filter(item => item.classId === classRoom.id && item.courseId === course.id && Date.parse(item.availableAt) <= nowMs)
  const anchor = pack.lessons.find(item => item.classId === classRoom.id && item.courseId === course.id && item.role === 'anchor')
  const lessonEvents = visibleEvents.filter(event => event.lessonId === anchor?.id)
  const started = lessonEvents.find(event => event.kind === 'lesson-started')
  const ended = lessonEvents.find(event => event.kind === 'lesson-ended')
  const lesson: CopilotScenarioView['lesson'] = !failure && anchor ? {
    ...anchor, status: ended ? 'ended' : started ? 'in-progress' : 'scheduled',
    actualStartedAt: started?.at ?? null, actualEndedAt: ended?.at ?? null,
  } : null
  const publishedHomeworks = failure ? [] : pack.homeworks.filter(item => item.classId === classRoom.id && item.courseId === course.id
    && visibleEvents.some(event => event.kind === 'homework-published' && event.homeworkId === item.id))
  const homework = publishedHomeworks.find(item => item.role === 'anchor') ?? null
  const submittedState = (item: ScenarioHomework): CopilotScenarioView['submission'] => {
    const ownEvents = visibleEvents.filter(event => event.homeworkId === item.id)
    const submitted = new Set(ownEvents.filter(event => event.kind === 'homework-submitted').map(event => event.studentId))
    const graded = new Set(ownEvents.filter(event => event.kind === 'homework-graded').map(event => event.studentId))
    return { status: 'ready',
      unsubmitted: studentList(item.studentIds.filter(id => !submitted.has(id))),
      pendingGrading: studentList(item.studentIds.filter(id => submitted.has(id) && !graded.has(id))),
      graded: studentList(item.studentIds.filter(id => submitted.has(id) && graded.has(id))),
    }
  }
  const submission: CopilotScenarioView['submission'] = failure
    ? { status: failure, unsubmitted: null, pendingGrading: null, graded: null }
    : homework ? submittedState(homework) : { status: 'ready', unsubmitted: [], pendingGrading: [], graded: [] }
  const excusedIds = new Set(lessonEvents.filter(event => event.kind === 'student-excused').map(event => event.studentId))
  const enteredIds = new Set(lessonEvents.filter(event => event.kind === 'student-entered').map(event => event.studentId))
  const attendance: CopilotScenarioView['attendance'] = failure
    ? { status: failure, expected: null, excused: null, entered: null, missing: null }
    : { status: 'ready', expected: anchor?.rosterStudentIds.length ?? 0,
      excused: studentList((anchor?.rosterStudentIds ?? []).filter(id => excusedIds.has(id))),
      entered: studentList((anchor?.rosterStudentIds ?? []).filter(id => enteredIds.has(id) && !excusedIds.has(id))),
      // Before actual start, "not entered" is not absence and must not trigger a reminder.
      missing: started ? studentList((anchor?.rosterStudentIds ?? []).filter(id => !excusedIds.has(id) && !enteredIds.has(id))) : [],
    }
  const actions: ScenarioAction[] = []
  const action = (value: Omit<ScenarioAction, 'classId' | 'courseId' | 'courseTitle' | 'businessRef'>) => {
    const id = `${classRoom.id}/${course.id}/${value.id}`
    if (!options.consumedActionIds?.includes(id)) actions.push({ ...value, id,
      classId: classRoom.id, courseId: course.id, courseTitle: course.title,
      prompt: value.prompt ? `在${classRoom.name}的「${course.title}」中，${value.prompt}` : null,
      businessRef: { classId: classRoom.id, courseId: course.id, lessonId: value.targetLessonId, homeworkId: value.targetHomeworkId },
    })
  }
  if (lesson?.status === 'scheduled' && Date.parse(lesson.startsAt) - nowMs <= 30 * 60_000
    && Date.parse(lesson.startsAt) > nowMs) {
    action({ id: `${lesson.id}:preclass`, kind: 'preclass-reminder', title: '快上课了，提醒大家提前准备',
      description: '为当前班级准备一条开课提醒。', count: 1, unit: '节课', buttonLabel: '生成开课提醒',
      prompt: '帮我给这个班准备一条开课提醒，提醒大家提前进入课堂，语气简洁友好。',
      targetStudentIds: [], targetLessonId: lesson.id, targetHomeworkId: null, delivery: 'group', urgency: 'normal' })
  }
  if (lesson?.status === 'in-progress' && (attendance.missing?.length ?? 0) > 0) {
    const targets = attendance.missing ?? []
    action({ id: `${lesson.id}:attendance`, kind: 'attendance-reminder', title: `${targets.length} 位学员还未进入课堂`,
      description: '已排除请假学员，为尚未进入的学员分别准备提醒。', count: targets.length, unit: '名学员',
      buttonLabel: '生成个人提醒', prompt: '帮我分别提醒还没进入当前课堂的学员，已请假的不用提醒，语气温和一些。',
      targetStudentIds: targets.map(item => item.id), targetLessonId: lesson.id, targetHomeworkId: null,
      delivery: 'private', urgency: 'urgent' })
  }
  if (lesson?.status === 'ended' && homework?.lessonId === lesson.id && lesson.actualEndedAt
    && Date.parse(homework.publishedAt) >= Date.parse(lesson.actualEndedAt)
    && nowMs - Date.parse(lesson.actualEndedAt) <= 30 * 60_000) {
    action({ id: `${homework.id}:announcement`, kind: 'homework-announcement', title: '本次课堂已结束，作业已发布',
      description: '给班级准备一条学习任务通知。', count: 1, unit: '份作业', buttonLabel: '生成作业通知',
      prompt: '帮我给这个班准备一条刚发布的学习任务通知，包含作业入口和截止时间。', targetStudentIds: [],
      targetLessonId: lesson.id, targetHomeworkId: homework.id, delivery: 'group', urgency: 'normal' })
  }
  for (const item of publishedHomeworks) {
    const state = submittedState(item)
    const outstanding = state.unsubmitted ?? []
    const reminded = new Set(visibleEvents.filter(event => event.kind === 'reminder-sent' && event.homeworkId === item.id).map(event => event.studentId))
    const reminderTargets = outstanding.filter(student => !reminded.has(student.id))
    if (reminderTargets.length > 0 && nowMs >= Date.parse(item.dueAt) - 6 * 3_600_000) {
      action({ id: `${item.id}:reminder`, kind: 'homework-reminder',
        title: reminded.size ? `${outstanding.length} 位学员尚未提交，${reminderTargets.length} 位可提醒` : `${outstanding.length} 位学员尚未提交作业`,
        description: `${item.title} · ${reminded.size ? '已提醒的学员本次不重复提醒。' : '为未提交的学员分别准备提醒。'}`,
        count: reminderTargets.length, unit: '名学员',
        buttonLabel: '生成催交提醒', prompt: `帮我分别提醒还没提交「${item.title}」的学员，说明截止时间，语气温和一些。`,
        targetStudentIds: reminderTargets.map(student => student.id), targetLessonId: item.lessonId,
        targetHomeworkId: item.id, delivery: 'private', urgency: 'urgent' })
    }
    const pending = state.pendingGrading ?? []
    if (pending.length > 0) {
      action({ id: `${item.id}:grading`, kind: 'teacher-grading', title: item.title,
        description: `${pending.length} 份已提交，等待你批改。`, count: pending.length, unit: '份作业',
        buttonLabel: '查看待批改名单', prompt: null, targetStudentIds: pending.map(student => student.id),
        targetLessonId: item.lessonId, targetHomeworkId: item.id, delivery: 'teacher-work', urgency: 'normal' })
    }
  }
  for (const event of visibleEvents.filter(item => item.kind === 'recap-ready')) {
    const recap = pack.lessons.find(item => item.id === event.lessonId)
    if (!recap || Date.parse(recap.scheduledEndsAt) > nowMs || !recapMaterials.some(item => item.lessonId === recap.id)) continue
    action({ id: `${recap.id}:recap`, kind: 'class-recap', title: recap.title, description: '课堂已结束，可以准备课堂回顾。',
      count: 1, unit: '节课', buttonLabel: '生成课堂回顾', prompt: `帮我准备「${recap.title}」的课堂回顾，先检查课堂材料是否足够。`,
      targetStudentIds: [], targetLessonId: recap.id, targetHomeworkId: null, delivery: 'private', urgency: 'normal' })
  }
  // M2 acceptance parameters, not production policy defaults.
  const opportunities = projectOpportunities(actions, publishedHomeworks, failure)
  const courseContexts = [{ course, lesson, homework, publishedHomeworks, attendance, submission, actions }]
  const result: CopilotScenarioView = {
    scenarioId, now: new Date(nowMs).toISOString(), teacher: pack.teacher, classes: pack.classes,
    classRoom, courses, course, courseContexts, students: failure ? [] : students, lesson, homework, publishedHomeworks, attendance, submission, opportunities,
    messages: failure ? [] : pack.messages.filter(item => item.classId === classRoom.id && Date.parse(item.at) <= nowMs),
    visibleEvents, recapMaterials, evidence: { packVersion: pack.version, snapshotId: pack.snapshotId, truthLabel: pack.truthLabel,
      membershipStatus: 'unknown', gaps: pack.gaps },
    agentContext: { asOf: new Date(nowMs).toISOString(), classId: classRoom.id, className: classRoom.name,
      courseId: course.id, courseTitle: course.title, courses, courseContexts,
      lesson, homework, publishedHomeworks, attendance, submission, actions, recapMaterials },
  }
  // A caller can edit its own view without mutating the reset baseline or another chat's view.
  return structuredClone(result)
}

function projectOpportunities(
  actions: ScenarioAction[],
  homeworks: ScenarioHomework[],
  failure: CopilotScenarioOptions['failure'],
): CopilotScenarioView['opportunities'] {
  const priority: Partial<Record<ScenarioAction['kind'], number>> = {
    'attendance-reminder': 0, 'homework-reminder': 1, 'homework-announcement': 2, 'preclass-reminder': 3,
  }
  const deadline = (action: ScenarioAction) => homeworks.find(item => item.id === action.targetHomeworkId && item.courseId === action.courseId)?.dueAt
  const main = actions.filter(item => priority[item.kind] !== undefined).sort((left, right) => {
    const order = (priority[left.kind] ?? 99) - (priority[right.kind] ?? 99)
    if (order !== 0) return order
    return (deadline(left) ?? '').localeCompare(deadline(right) ?? '') || left.id.localeCompare(right.id)
  })[0] ?? null
  const secondaryActions = actions.filter(item => item.id !== main?.id)
  const recapItems = secondaryActions.filter(item => item.kind === 'class-recap')
  const homeworkItems = secondaryActions.filter(item => item.kind === 'homework-reminder' || item.kind === 'teacher-grading')
  return { main, secondary: [
    { id: 'class-recap', label: '课堂回顾', status: failure ?? 'ready', count: failure ? null : new Set(recapItems.map(item => `${item.classId}/${item.courseId}/${item.targetLessonId}`)).size, unit: '节课', items: recapItems },
    { id: 'homework', label: '作业跟进', status: failure ?? 'ready', count: failure ? null : new Set(homeworkItems.map(item => `${item.classId}/${item.courseId}/${item.targetHomeworkId}`)).size, unit: '份作业', items: homeworkItems },
  ] }
}

/** Group entry aggregates its courses; an action supplies courseId for an exact preparation/revalidation scope. */
export function projectCopilotScenario(
  scenarioId: CopilotScenarioId,
  options: CopilotScenarioOptions = {},
): CopilotScenarioView {
  if (options.courseId) return projectCourseScenario(scenarioId, options)
  const classId = options.classId ?? 'copilot-class-a'
  const courses = pack.courses.filter(item => item.classId === classId)
  if (courses.length === 0) throw new Error('Unknown Copilot class')
  const views = courses.map(course => projectCourseScenario(scenarioId, { ...options, courseId: course.id }))
  const actions = views.flatMap(view => view.agentContext.actions)
  const publishedHomeworks = views.flatMap(view => view.publishedHomeworks)
  const failure = options.failure ?? (scenarioId === 'S8' ? 'unknown' : undefined)
  const opportunities = projectOpportunities(actions, publishedHomeworks, failure)
  const active = views.find(view => view.course.id === opportunities.main?.courseId) ?? views[0]
  if (!active) throw new Error('No course projection available')
  const courseContexts = views.flatMap(view => view.courseContexts)
  const visibleEvents = views.flatMap(view => view.visibleEvents).sort((left, right) => left.at.localeCompare(right.at) || left.id.localeCompare(right.id))
  const recapMaterials = views.flatMap(view => view.recapMaterials)
  return structuredClone({ ...active, courses, courseContexts, publishedHomeworks, opportunities, visibleEvents, recapMaterials,
    agentContext: { ...active.agentContext, courses, courseContexts, publishedHomeworks, actions, recapMaterials },
  })
}
