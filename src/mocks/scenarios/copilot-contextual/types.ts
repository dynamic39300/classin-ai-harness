export type CopilotScenarioId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9'
export type CopilotClassId = 'copilot-class-a' | 'copilot-class-b'
export type Availability = 'ready' | 'unknown' | 'denied' | 'retryable'

export interface ScenarioStudent {
  id: string
  name: string
  privateThreadId: string
}

export interface ScenarioCourse {
  id: string
  classId: CopilotClassId
  title: string
  studentIds: string[]
  relationshipSource: 'simulated-course-link' | 'dw-category-derived'
  sourceMappingStatus: 'unknown' | 'reference-verified'
  catalogNameStatus: 'unknown'
  titleSource: 'independent-alias'
}

export interface ScenarioBusinessRef {
  classId: CopilotClassId
  courseId: string
  lessonId: string | null
  homeworkId: string | null
}

export interface ScenarioClass {
  id: CopilotClassId
  name: string
  threadId: string
  teacherId: string
  studentIds: string[]
  membershipStatus: 'unknown'
  collectionScope: 'complete-selected-homework-associations'
  sourceCounts: {
    courseStudentNum: number
    lessons: number
    teacherLessons: number
    homeworks: number
    activeWorkRows: number
    distinctHomeworkStudents: number
    lessonRosterRows: number
    attendanceRows: number
    messages: number
  }
}

export interface ScenarioLesson {
  id: string
  classId: CopilotClassId
  courseId: string
  title: string
  teacherId: string
  startsAt: string
  scheduledEndsAt: string
  scheduleSource: 'dw-time-shifted' | 'simulated-schedule'
  role: 'anchor' | 'recap'
  rosterStudentIds: string[]
  rosterSource: 'simulated-roster-from-homework-associations'
}

export interface ScenarioHomework {
  id: string
  classId: CopilotClassId
  courseId: string
  title: string
  studentIds: string[]
  publishedAt: string
  dueAt: string
  lessonId: string | null
  lessonLinkSource: 'simulated-link' | 'unknown'
  timingSource: 'simulated-events'
  role: 'anchor' | 'prior-review'
}

export interface ScenarioEvent {
  id: string
  classId: CopilotClassId
  courseId: string
  at: string
  kind: 'lesson-started' | 'lesson-ended' | 'student-entered' | 'student-excused' | 'homework-published' | 'homework-submitted' | 'homework-graded' | 'reminder-sent' | 'recap-ready'
  studentId?: string
  lessonId?: string
  homeworkId?: string
  source: 'simulated-event'
  reason: string
}

export interface ScenarioRecapMaterial {
  id: string
  lessonId: string
  classId: CopilotClassId
  courseId: string
  availableAt: string
  source: 'simulated-material'
  text: string
}

export interface ScenarioAction {
  id: string
  classId: CopilotClassId
  courseId: string
  courseTitle: string
  businessRef: ScenarioBusinessRef
  kind: 'preclass-reminder' | 'attendance-reminder' | 'homework-announcement' | 'homework-reminder' | 'class-recap' | 'teacher-grading'
  title: string
  description: string
  count: number
  unit: '名学员' | '份作业' | '节课'
  buttonLabel: string
  prompt: string | null
  targetStudentIds: string[]
  targetLessonId: string | null
  targetHomeworkId: string | null
  delivery: 'group' | 'private' | 'teacher-work'
  urgency: 'normal' | 'urgent'
}

export interface ScenarioSecondary {
  id: 'class-recap' | 'homework'
  label: string
  status: Availability
  count: number | null
  unit: '节课' | '份作业'
  items: ScenarioAction[]
}

export interface CopilotScenarioView {
  scenarioId: CopilotScenarioId
  now: string
  teacher: { id: string; name: string }
  classes: ScenarioClass[]
  classRoom: ScenarioClass
  courses: ScenarioCourse[]
  course: ScenarioCourse
  students: ScenarioStudent[]
  lesson: (ScenarioLesson & { status: 'scheduled' | 'in-progress' | 'ended'; actualStartedAt: string | null; actualEndedAt: string | null }) | null
  homework: ScenarioHomework | null
  publishedHomeworks: ScenarioHomework[]
  attendance: { status: Availability; expected: number | null; excused: ScenarioStudent[] | null; entered: ScenarioStudent[] | null; missing: ScenarioStudent[] | null }
  submission: { status: Availability; unsubmitted: ScenarioStudent[] | null; pendingGrading: ScenarioStudent[] | null; graded: ScenarioStudent[] | null }
  opportunities: { main: ScenarioAction | null; secondary: ScenarioSecondary[] }
  messages: { id: string; classId: CopilotClassId; at: string; text: string; source: 'semantic-rewrite' }[]
  visibleEvents: ScenarioEvent[]
  recapMaterials: ScenarioRecapMaterial[]
  evidence: { packVersion: string; snapshotId: string; truthLabel: 'dw-derived-with-simulated-events'; membershipStatus: 'unknown'; gaps: string[] }
  courseContexts: ScenarioCourseContext[]
  agentContext: {
    asOf: string
    classId: CopilotClassId
    className: string
    courseId: string
    courseTitle: string
    courses: ScenarioCourse[]
    courseContexts: ScenarioCourseContext[]
    lesson: CopilotScenarioView['lesson']
    homework: ScenarioHomework | null
    publishedHomeworks: ScenarioHomework[]
    attendance: CopilotScenarioView['attendance']
    submission: CopilotScenarioView['submission']
    actions: ScenarioAction[]
    recapMaterials: ScenarioRecapMaterial[]
  }
}

export interface ScenarioCourseContext {
  course: ScenarioCourse
  lesson: CopilotScenarioView['lesson']
  homework: ScenarioHomework | null
  publishedHomeworks: ScenarioHomework[]
  attendance: CopilotScenarioView['attendance']
  submission: CopilotScenarioView['submission']
  actions: ScenarioAction[]
}

export interface CopilotScenarioOptions {
  classId?: CopilotClassId
  courseId?: string
  /** Absolute scenario time; never changes the OS clock. Omit to reset to the checkpoint. */
  at?: string
  failure?: Exclude<Availability, 'ready'>
  consumedActionIds?: string[]
}

export interface CopilotScenarioPack {
  version: string
  snapshotId: string
  truthLabel: 'dw-derived-with-simulated-events'
  teacher: { id: string; name: string }
  classes: ScenarioClass[]
  courses: ScenarioCourse[]
  students: ScenarioStudent[]
  lessons: ScenarioLesson[]
  homeworks: ScenarioHomework[]
  events: ScenarioEvent[]
  recapMaterials: ScenarioRecapMaterial[]
  messages: CopilotScenarioView['messages']
  checkpoints: Record<CopilotScenarioId, string>
  gaps: string[]
}
