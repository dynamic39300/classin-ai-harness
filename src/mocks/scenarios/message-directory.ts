import type { MessageDirectorySnapshot } from '@domain/message/message-directory';

export const MESSAGE_DIRECTORY_SNAPSHOT: MessageDirectorySnapshot = Object.freeze({
  people: [
    { id: 'person-li', name: '李明', initial: 'L', identityLabel: '学生', relationship: '高二物理 3 班', organizationUnitId: 'org-physics', classInId: 'CI100820', phoneMasked: '138****0820', emailMasked: 'li***@demo.classin.cn', remark: '物理课学生', friendState: 'friend', visibleTo: ['teacher'], targetThreadId: 'direct-wang-li' },
    { id: 'person-zhang', name: '张老师', initial: 'Z', identityLabel: '教师', relationship: '物理教研组', organizationUnitId: 'org-physics', classInId: 'CI200317', phoneMasked: '139****0317', emailMasked: 'zhang***@demo.classin.cn', friendState: 'friend', visibleTo: ['teacher'], targetThreadId: 'direct-teacher-zhang' },
    { id: 'person-lin', name: '林老师', initial: 'L', identityLabel: '教师', relationship: '物理教研组', organizationUnitId: 'org-physics', classInId: 'CI200901', phoneMasked: '136****0901', emailMasked: 'lin***@demo.classin.cn', friendState: 'pending', visibleTo: ['teacher'], recommendationReason: '同属物理教研组' },
    { id: 'person-chen-research', name: '陈教研员', initial: 'C', identityLabel: '教研员', relationship: '教学中心', organizationUnitId: 'org-teaching', classInId: 'CI300101', phoneMasked: '137****0101', emailMasked: 'chen***@demo.classin.cn', friendState: 'recommended', visibleTo: ['teacher'], recommendationReason: '共同参与高二课程教研' },
    { id: 'person-wang', name: '王老师', initial: 'W', identityLabel: '教师', relationship: '高二物理 3 班', organizationUnitId: 'org-physics', classInId: 'CI200808', phoneMasked: '138****0808', emailMasked: 'wang***@demo.classin.cn', friendState: 'friend', visibleTo: ['student-family'], targetThreadId: 'direct-wang-li' },
    { id: 'person-chen', name: '陈老师', initial: 'C', identityLabel: '教师', relationship: '初三英语 2 班', organizationUnitId: 'org-english', classInId: 'CI200909', phoneMasked: '139****0909', emailMasked: 'chen***@demo.classin.cn', friendState: 'friend', visibleTo: ['student-family'], targetThreadId: 'direct-student-chen' },
    { id: 'person-zhou', name: '周然', initial: 'Z', identityLabel: '同学', relationship: '高二物理 3 班', organizationUnitId: 'org-physics', classInId: 'CI101008', phoneMasked: '135****1008', emailMasked: 'zhou***@demo.classin.cn', friendState: 'friend', visibleTo: ['student-family'], targetThreadId: 'direct-student-zhou' },
    { id: 'person-yang', name: '杨老师', initial: 'Y', identityLabel: '教师', relationship: '学习支持中心', organizationUnitId: 'org-teaching', classInId: 'CI201212', phoneMasked: '137****1212', emailMasked: 'yang***@demo.classin.cn', friendState: 'recommended', visibleTo: ['student-family'], recommendationReason: '你所在班级的学习支持老师' },
  ],
  classes: [
    { id: 'physics-3', name: '高二物理 3 班', classCode: 'PHY2303', ownerName: '王老师', memberCount: 30, visibleTo: ['teacher', 'student-family'], memberRoles: ['teacher', 'student-family'], threadId: 'class-physics-3' },
    { id: 'physics-1', name: '高二物理 1 班', classCode: 'PHY2301', ownerName: '赵老师', memberCount: 32, visibleTo: ['teacher'], memberRoles: ['teacher'], threadId: 'class-physics-1' },
    { id: 'english-2', name: '初三英语 2 班', classCode: 'ENG3202', ownerName: '陈老师', memberCount: 28, visibleTo: ['student-family'], memberRoles: ['student-family'], threadId: 'class-english-2' },
    { id: 'history-physics', name: '高一物理基础班', classCode: 'PHY1108', ownerName: '张老师', memberCount: 26, visibleTo: ['teacher', 'student-family'], memberRoles: ['teacher', 'student-family'], threadId: 'class-history-physics' },
    { id: 'discover-chemistry', name: '高二化学拓展班', classCode: 'CHE2306', ownerName: '刘老师', memberCount: 24, visibleTo: ['teacher', 'student-family'], memberRoles: [] },
  ],
  openCourses: [
    { id: 'open-reading', name: '高效阅读公开课', courseCode: 'OC-READ-0808', subject: '英语', instructorName: '陈老师', scheduleLabel: '8月8日 16:00', statusLabel: '待开始', visibleTo: ['teacher', 'student-family'] },
    { id: 'open-family', name: '家长会说明会', courseCode: 'OC-FAMILY-0808', subject: '家庭教育', instructorName: '王老师', scheduleLabel: '8月8日 19:00', statusLabel: '待开始', visibleTo: ['teacher', 'student-family'] },
    { id: 'open-history', name: '产品经理成长训练营', courseCode: 'OC-PM-0806', subject: '职业素养', instructorName: '张老师', scheduleLabel: '8月6日 19:00', statusLabel: '已结束', visibleTo: ['teacher'] },
  ],
  organizationUnits: [
    { id: 'org-root', name: 'ClassIn 教学机构（演示）', parentId: null, visibleTo: ['teacher', 'student-family'] },
    { id: 'org-teaching', name: '教学中心', parentId: 'org-root', visibleTo: ['teacher', 'student-family'] },
    { id: 'org-physics', name: '物理教研组', parentId: 'org-teaching', visibleTo: ['teacher', 'student-family'] },
    { id: 'org-english', name: '英语教研组', parentId: 'org-teaching', visibleTo: ['teacher', 'student-family'] },
  ],
  friendEvents: [
    { id: 'friend-event-lin', personId: 'person-lin', createdAt: '2026-09-09T09:20:00+08:00', status: 'pending', direction: 'incoming', visibleTo: ['teacher'] },
    { id: 'friend-event-zhang', personId: 'person-zhang', createdAt: '2026-09-08T16:10:00+08:00', status: 'accepted', direction: 'incoming', visibleTo: ['teacher'] },
    { id: 'friend-event-yang', personId: 'person-yang', createdAt: '2026-09-09T08:45:00+08:00', status: 'pending', direction: 'incoming', visibleTo: ['student-family'] },
  ],
  identityByRole: {
    teacher: { name: '王老师（演示）', inCode: 'IN-TEACH-2026', qrLabel: '教师演示身份二维码' },
    'student-family': { name: '李明（演示）', inCode: 'IN-STUDENT-2026', qrLabel: '学生演示身份二维码' },
  },
});
