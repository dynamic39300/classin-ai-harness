#!/usr/bin/env python3
"""Derive a fixed anonymous pack. Never writes source files or prints source identities."""
import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / '.runtime/private/copilot-source-2026-09-09'
PRIVATE = ROOT / '.runtime/private/copilot-derived-2026-09-09-v1'
OUTPUT = ROOT / 'src/mocks/scenarios/copilot-contextual/versions/v1'
VERSION = 'im-copilot-contextual-v1'


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def iso(seconds):
    return datetime.fromtimestamp(seconds, timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def sid(value):
    return str(value)


def main(check=False):
    manifest = json.loads((SOURCE / 'snapshot-manifest.json').read_text())
    files = {item['file']: item for item in manifest['files']}

    def verify_source():
        for filename, item in files.items():
            payload = (SOURCE / filename).read_bytes()
            if hashlib.sha256(payload).hexdigest() != item['sha256']:
                raise ValueError('Frozen source digest mismatch; source not modified by this script')
        return len(files)

    source_verified = verify_source()

    def rows(name):
        filename = name + '.json'
        if filename not in files:
            raise ValueError('Input is not in the frozen manifest: ' + name)
        return json.loads((SOURCE / filename).read_text())['data']

    teacher = rows('selected_teacher')[0]
    courses = rows('selected_courses')
    lessons = rows('selected_lessons')
    homeworks = rows('selected_homeworks') + rows('older_unfinished_homework_full')
    works = [row for filename in sorted(files) if filename.startswith('selected_student_work_')
             for row in rows(filename[:-5])]
    rosters = rows('selected_lesson_rosters')
    attendance = rows('selected_attendance')
    messages = rows('selected_messages')
    activities = rows('selected_activities')
    units = rows('selected_units')
    profiles = rows('selected_student_profiles')

    def in_class(collection, course, field='course_id'):
        return [row for row in collection if sid(row[field]) == sid(course['course_id'])]

    candidates = [course for course in courses
                  if len(in_class(homeworks, course)) >= 2
                  and in_class(rosters, course)
                  and in_class(messages, course, 'clusterid')]
    candidates.sort(key=lambda course: (-len(in_class(homeworks, course)), sid(course['course_id'])))
    selected = candidates[:2]
    if len(selected) != 2:
        raise ValueError('Expected two coherent candidates with homework, roster and messages')
    # Full identity mapping stays private; emitted IDs contain no source ID/hash/name fragments.
    maps = {'teacher': {sid(teacher['teacher_uid']): 'copilot-teacher-a'}, 'classes': {},
            'students': {}, 'lessons': {}, 'homeworks': {}, 'activities': {}, 'units': {}, 'messages': {}, 'participants': {}, 'coTeachers': {}}
    selected_works = [row for course in selected for row in in_class(works, course)]
    student_ids = sorted({sid(row['student_uid']) for row in selected_works if row['is_del'] == 0})
    maps['students'] = {raw: f'copilot-student-{index:03d}' for index, raw in enumerate(student_ids, 1)}
    students = [{'id': anon, 'name': f'学员{index:03d}', 'privateThreadId': 'copilot-private-' + anon.rsplit('-', 1)[1]}
                for index, anon in enumerate(maps['students'].values(), 1)]
    associated_participants = sorted({sid(row['student_uid']) for course in selected for row in in_class(rosters, course)}
                                    | {sid(row['member_uid']) for course in selected for row in in_class(attendance, course)})
    maps['participants'] = {raw: maps['students'].get(raw, f'copilot-source-participant-{index:03d}')
                            for index, raw in enumerate(associated_participants, 1)}
    co_teachers = sorted({sid(row['main_st_id']) for course in selected for row in in_class(lessons, course)
                          if sid(row['main_st_id']) != sid(teacher['st_id'])})
    maps['coTeachers'] = {raw: f'copilot-co-teacher-{index:03d}' for index, raw in enumerate(co_teachers, 1)}
    source_anchor = None
    anchors = []
    for course in selected:
        roster_lessons = {sid(row['class_id']) for row in in_class(rosters, course)}
        eligible = [row for row in in_class(lessons, course)
                    if sid(row['class_id']) in roster_lessons and sid(row['main_st_id']) == sid(teacher['st_id'])]
        anchor = min(eligible, key=lambda row: row['class_btime'])
        anchors.append(anchor)
        if source_anchor is None:
            source_anchor = anchor['class_btime']
    target = int(datetime.fromisoformat('2026-09-15T19:00:00+08:00').timestamp())
    shift = target - source_anchor
    shifted = lambda value: iso(int(value) + shift) if value else None
    classes, scene_lessons, scene_homeworks, scene_messages, events, materials = [], [], [], [], [], []
    inventory = {'version': VERSION, 'truthLabel': 'anonymized-frozen-source-not-live',
                 'lessons': [], 'homeworks': [], 'studentWork': [], 'activities': [], 'units': [],
                 'sourceMessageRewrites': [], 'lessonRoster': [], 'attendanceSnapshot': []}
    private_evidence = {'version': VERSION, 'sourceToScenarioOffsetSeconds': shift, 'maps': maps, 'selection': [],
                        'teacherInstitutionRelation': {'school_uid': teacher['school_uid'], 'st_id': teacher['st_id']}}

    def event(class_id, when, kind, reason, **refs):
        events.append({'id': f'copilot-event-{len(events) + 1:04d}', 'classId': class_id,
                       'at': iso(when), 'kind': kind, 'source': 'simulated-event', 'reason': reason, **refs})

    for class_index, (course, anchor) in enumerate(zip(selected, anchors)):
        class_id = 'copilot-class-' + ('a' if class_index == 0 else 'b')
        maps['classes'][sid(course['course_id'])] = class_id
        own_works = in_class(works, course)
        own_lessons = sorted(in_class(lessons, course), key=lambda row: (row['class_btime'], sid(row['class_id'])))
        own_homeworks = sorted(in_class(homeworks, course), key=lambda row: (row['start_time'], sid(row['homework_id'])))
        own_students = sorted({maps['students'][sid(row['student_uid'])] for row in own_works if row['is_del'] == 0})
        own_messages = sorted(in_class(messages, course, 'clusterid'), key=lambda row: row['timetag'])
        classes.append({'id': class_id, 'name': '秋季学习一班' if class_index == 0 else '秋季学习二班',
                        'threadId': class_id + '-group', 'teacherId': 'copilot-teacher-a',
                        'studentIds': own_students, 'membershipStatus': 'unknown',
                        'collectionScope': 'complete-selected-homework-associations',
                        'sourceCounts': {'courseStudentNum': course['student_num'], 'lessons': len(own_lessons),
                                         'teacherLessons': sum(sid(row['main_st_id']) == sid(teacher['st_id']) for row in own_lessons),
                                         'homeworks': len(own_homeworks), 'activeWorkRows': sum(row['is_del'] == 0 for row in own_works),
                                         'distinctHomeworkStudents': len(own_students),
                                         'lessonRosterRows': len(in_class(rosters, course)),
                                         'attendanceRows': len(in_class(attendance, course)), 'messages': len(own_messages)}})
        for index, lesson in enumerate(own_lessons, 1):
            anon = f'{class_id}-lesson-{index:02d}'
            maps['lessons'][sid(lesson['class_id'])] = anon
            inventory['lessons'].append({'id': anon, 'classId': class_id, 'title': f'阶段学习 · 第{index}讲',
                                         'teacherId': 'copilot-teacher-a' if sid(lesson['main_st_id']) == sid(teacher['st_id']) else maps['coTeachers'][sid(lesson['main_st_id'])],
                                         'startsAt': shifted(lesson['class_btime']), 'endsAt': shifted(lesson['class_etime']),
                                         'sourceSnapshotStatus': lesson['class_status'], 'deleted': bool(lesson['is_del']),
                                         'truthLabel': 'dw-time-shifted-title-replaced'})
        for index, homework in enumerate(own_homeworks, 1):
            anon = f'{class_id}-homework-{index:02d}'
            maps['homeworks'][sid(homework['homework_id'])] = anon
            assigned = [row for row in own_works if sid(row['homework_id']) == sid(homework['homework_id']) and row['is_del'] == 0]
            if len(assigned) != homework['num'] or sum(row['status'] > 0 for row in assigned) != homework['cnum'] or sum(row['status'] == 2 for row in assigned) != homework['rnum']:
                raise ValueError('Per-homework source snapshot counts do not reconcile')
            inventory['homeworks'].append({'id': anon, 'classId': class_id, 'title': f'阶段巩固练习 {index}',
                                           'publishedAt': shifted(homework['start_time']), 'dueAt': shifted(homework['end_time']),
                                           'sourceSnapshotCounts': {'assigned': homework['num'], 'submitted': homework['cnum'], 'graded': homework['rnum']},
                                           'truthLabel': 'dw-time-shifted-title-replaced'})
        for index, row in enumerate(sorted(own_works, key=lambda row: sid(row['stu_homework_id'])), 1):
            inventory['studentWork'].append({'id': f'{class_id}-work-{index:04d}', 'classId': class_id,
                                             'homeworkId': maps['homeworks'][sid(row['homework_id'])],
                                             'studentId': maps['students'].get(sid(row['student_uid'])),
                                             'sourceSnapshotStatus': row['status'], 'deleted': bool(row['is_del']),
                                             'draft': bool(row['is_draft']), 'recordedSubmittedAt': shifted(row['ref_time']),
                                             'recordedGradedAt': shifted(row['th_time']),
                                             'truthLabel': 'dw-snapshot-not-replayed'})
        for index, row in enumerate(sorted(in_class(rosters, course), key=lambda row: sid(row['class_and_student_id'])), 1):
            inventory['lessonRoster'].append({'id': f'{class_id}-source-roster-{index:03d}', 'classId': class_id,
                                              'lessonId': maps['lessons'].get(sid(row['class_id'])),
                                              'participantId': maps['participants'][sid(row['student_uid'])],
                                              'deleted': bool(row['isdel']), 'truthLabel': 'dw-roster-snapshot-not-expected-roster'})
        for index, row in enumerate(sorted(in_class(attendance, course), key=lambda row: sid(row['id'])), 1):
            inventory['attendanceSnapshot'].append({'id': f'{class_id}-source-attendance-{index:03d}', 'classId': class_id,
                                                    'lessonId': maps['lessons'].get(sid(row['class_id'])),
                                                    'participantId': maps['participants'][sid(row['member_uid'])],
                                                    'sourceRoleCode': row['identity'], 'sourceIsLate': row['is_late'],
                                                    'sourceIsOn': row['is_on'], 'sourceIsEarly': row['is_early'],
                                                    'stayinSeconds': row['stayin_time'], 'timeListAvailable': bool(row['time_list']),
                                                    'truthLabel': 'dw-attendance-snapshot-not-absence'})
        for index, unit in enumerate(sorted(in_class(units, course), key=lambda row: sid(row['id'])), 1):
            anon = f'{class_id}-unit-{index:03d}'
            maps['units'][sid(unit['id'])] = anon
            inventory['units'].append({'id': anon, 'classId': class_id, 'title': f'学习单元 {index}',
                                       'categoryName': None, 'publishedFlag': unit['publish_flag'], 'deleted': bool(unit['is_deleted'])})
        for index, activity in enumerate(sorted(in_class(activities, course), key=lambda row: sid(row['id'])), 1):
            anon = f'{class_id}-activity-{index:03d}'
            maps['activities'][sid(activity['id'])] = anon
            inventory['activities'].append({'id': anon, 'classId': class_id,
                                            'unitId': maps['units'].get(sid(activity['unit_id'])),
                                            'homeworkId': maps['homeworks'].get(sid(activity['biz_id'])),
                                            'lessonId': maps['lessons'].get(sid(activity['biz_id'])),
                                            'sourceBusinessType': activity['biz_type'], 'publishedFlag': activity['publish_flag'],
                                            'deleted': bool(activity['is_deleted'])})
        for index, message in enumerate(own_messages, 1):
            anon = f'{class_id}-message-{index:02d}'
            maps['messages'][sid(message['id'])] = anon
            text = str(message['msgdata'])
            # Rewrites only a broad detected topic, never copies names, links, numbers, dates or quotes.
            if '作业' in text or '练习' in text:
                rewrite = '本阶段学习任务已发布，请在作业入口查看要求。'
            elif '上课' in text or '课堂' in text or '开课' in text:
                rewrite = '请查看课程安排，提前准备好学习材料。'
            else:
                rewrite = '班级学习安排已更新，请查看相关内容。'
            # timetag is a transport sequence, not an epoch; use the extracted business datetime.
            stamp = int(message['timeformat'])
            item = {'id': anon, 'classId': class_id, 'at': shifted(stamp), 'text': rewrite, 'source': 'semantic-rewrite'}
            scene_messages.append(item)
            inventory['sourceMessageRewrites'].append(item)
        anchor_id = maps['lessons'][sid(anchor['class_id'])]
        start = anchor['class_btime'] + shift
        end = anchor['class_etime'] + shift
        scene_lessons.append({'id': anchor_id, 'classId': class_id, 'title': '阶段学习 · 本次课堂',
                              'teacherId': 'copilot-teacher-a', 'startsAt': iso(start), 'scheduledEndsAt': iso(end),
                              'scheduleSource': 'dw-time-shifted', 'role': 'anchor',
                              'rosterStudentIds': own_students, 'rosterSource': 'simulated-roster-from-homework-associations'})
        event(class_id, start, 'lesson-started', '实际开课事件未取得；独立补充，排课本身不代表已开课', lessonId=anchor_id)
        event(class_id, end, 'lesson-ended', '实际结束事件未取得；独立补充课堂结束', lessonId=anchor_id)
        event(class_id, start - 3600, 'student-excused', '真实请假数据缺失；固定请假案例', lessonId=anchor_id, studentId=own_students[-1])
        for student in own_students[:-4]:
            event(class_id, start + 60, 'student-entered', '原到课与名单不一致；统一应到集合上的模拟进入', lessonId=anchor_id, studentId=student)
        event(class_id, start + 12 * 60, 'student-entered', '模拟生成期间迟到者进入，待提醒人数 3→2', lessonId=anchor_id, studentId=own_students[-4])
        for student in own_students[-3:-1]:
            event(class_id, start + 15 * 60, 'student-entered', '模拟其余待提醒对象随后进入', lessonId=anchor_id, studentId=student)
        # A uses its full first assignment (51); B uses its full earlier assignment (127), no sample truncation.
        homework = own_homeworks[0]
        homework_id = maps['homeworks'][sid(homework['homework_id'])]
        assigned_students = sorted({maps['students'][sid(row['student_uid'])] for row in own_works
                                    if sid(row['homework_id']) == sid(homework['homework_id']) and row['is_del'] == 0})
        published = end + 120 if class_index == 0 else target - 2 * 86400
        due = target + 86400
        scene_homeworks.append({'id': homework_id, 'classId': class_id, 'title': '阶段巩固练习 1',
                                'studentIds': assigned_students, 'publishedAt': iso(published), 'dueAt': iso(due),
                                'lessonId': anchor_id if class_index == 0 else None,
                                'lessonLinkSource': 'simulated-link' if class_index == 0 else 'unknown',
                                'timingSource': 'simulated-events', 'role': 'anchor'})
        event(class_id, published, 'homework-published', '为闭环重设发布/截止时间；A 的本讲作业关系为明确模拟', homeworkId=homework_id)
        outstanding = 4 if class_index == 0 else 3
        submitted_at = published + 600
        for index, student in enumerate(assigned_students[:-outstanding]):
            event(class_id, submitted_at + index, 'homework-submitted', '原始末态不反推提交过程；独立模拟提交时间', homeworkId=homework_id, studentId=student)
            if index > 0:
                event(class_id, submitted_at + 600 + index, 'homework-graded', '独立模拟批改过程，保留 1 名已交待批', homeworkId=homework_id, studentId=student)
        for index, student in enumerate(assigned_students[-outstanding:]):
            event(class_id, due + 60 + index, 'homework-submitted', '模拟截止后提交，验证催交消失且待批仍在', homeworkId=homework_id, studentId=student)
        event(class_id, due - 1800, 'reminder-sent', '模拟已发送回执；不据此认定学生提交或已读', homeworkId=homework_id, studentId=assigned_students[-1])
        if class_index == 0:
            review_id = class_id + '-simulated-homework-review'
            scene_homeworks.append({'id': review_id, 'classId': class_id, 'title': '上一阶段巩固练习',
                                    'studentIds': own_students, 'publishedAt': iso(target - 2 * 86400),
                                    'dueAt': iso(target - 86400), 'lessonId': None, 'lessonLinkSource': 'unknown',
                                    'timingSource': 'simulated-events', 'role': 'prior-review'})
            event(class_id, target - 2 * 86400, 'homework-published', '新增模拟历史作业，仅验证课前待批角标；不冒充第十份源作业', homeworkId=review_id)
            for index, student in enumerate(own_students):
                event(class_id, target - 86400, 'homework-submitted', '模拟历史作业已全部提交', homeworkId=review_id, studentId=student)
                event(class_id, end - 60 if index == 0 else target - 86400 + 60, 'homework-graded',
                      '模拟课前保留一份待批、课后批完；学生催交与教师待批独立', homeworkId=review_id, studentId=student)
        for index in range(2):
            recap_id = f'{class_id}-simulated-recap-{index + 1}'
            recap_end = target - (2 - index) * 86400
            scene_lessons.append({'id': recap_id, 'classId': class_id, 'title': f'阶段学习 · 往期课堂 {index + 1}',
                                  'teacherId': 'copilot-teacher-a', 'startsAt': iso(recap_end - 3600),
                                  'scheduledEndsAt': iso(recap_end), 'scheduleSource': 'simulated-schedule', 'role': 'recap',
                                  'rosterStudentIds': own_students, 'rosterSource': 'simulated-roster-from-homework-associations'})
            event(class_id, recap_end, 'recap-ready', '课堂正文未取回；此为入口体验专用模拟材料可用事件，不能当真实内容生成依据', lessonId=recap_id)
            materials.append({'id': recap_id + '-material', 'lessonId': recap_id, 'classId': class_id,
                              'availableAt': iso(recap_end), 'source': 'simulated-material',
                              'text': '课堂围绕如何清楚说明解题步骤展开。老师先示范拆分任务，再请学员独立尝试并交流检查方法。课后建议先复习步骤，再完成配套巩固练习。此段为独立编写的固定模拟课堂材料，不是所选真实课堂的转写或总结。'})
        private_evidence['selection'].append({'classId': class_id, 'sourceCourseId': course['course_id'],
                                               'sourceAnchorLessonId': anchor['class_id'], 'sourceAnchorHomeworkId': homework['homework_id'],
                                               'teacherRelationsVerified': all(sid(row['teacher_uid']) == sid(teacher['teacher_uid']) for row in own_homeworks)})

    anchor_a = scene_lessons[0]
    end_a = int(datetime.fromisoformat(anchor_a['scheduledEndsAt'].replace('Z', '+00:00')).timestamp())
    pack = {'version': VERSION, 'snapshotId': manifest['snapshot_id'], 'truthLabel': 'dw-derived-with-simulated-events',
            'teacher': {'id': 'copilot-teacher-a', 'name': '王老师'}, 'classes': classes, 'students': students,
            'lessons': scene_lessons, 'homeworks': scene_homeworks, 'events': sorted(events, key=lambda item: (item['at'], item['id'])),
            'messages': scene_messages, 'recapMaterials': materials, 'checkpoints': {'S1': iso(target - 1200), 'S2': iso(target + 600),
            'S3': iso(target + 720), 'S4': iso(end_a + 300), 'S5': iso(target + 86400 - 3600),
            'S6': iso(target + 86400 + 300), 'S7': iso(target + 86400 - 3600), 'S8': iso(target + 86400 - 3600)},
            'gaps': ['full-group-membership-unverified', 'private-contact-links-simulated', 'roster-attendance-mismatch',
                     'leave-events-simulated', 'lesson-homework-link-simulated-for-class-a', 'lesson-materials-not-collected',
                     'category-title-unavailable', 'message-receipts-simulated', 'source-snapshot-not-atomic']}
    audit = {'version': VERSION, 'snapshotId': manifest['snapshot_id'], 'sourceFilesVerifiedBeforeAndAfter': source_verified,
             'originalSnapshotUnchanged': verify_source() == source_verified, 'sourceToScenarioOffsetSeconds': shift,
             'selectionRule': 'same-teacher, >=2 homeworks, roster and group messages, descending homework count',
             'sameTeacherHomeworkAndAnchorRelationsVerified': all(item['teacherRelationsVerified'] for item in private_evidence['selection']),
             'otherTeachingIdentitiesPreserved': len(co_teachers),
             'classes': [{key: value for key, value in item.items() if key in ['id', 'collectionScope', 'membershipStatus', 'sourceCounts']} for item in classes],
             'inventoryCounts': {key: len(value) for key, value in inventory.items() if isinstance(value, list)},
             'sourceHomeworksWithMatchedActivity': len({item['homeworkId'] for item in inventory['activities'] if item['homeworkId']}),
             'scenarioCounts': {'students': len(students), 'syntheticEvents': len(events), 'sceneHomeworks': len(scene_homeworks)},
             'outputsSha256': {'pack.json': hashlib.sha256(encoded(pack)).hexdigest(), 'source-inventory.json': hashlib.sha256(encoded(inventory)).hexdigest()},
             'privacy': {'rawIdentifiersIncluded': False, 'rawNamesIncluded': False, 'rawMessageTextIncluded': False,
                         'privateIdentityMapCommitted': False, 'sourceAttachmentsCopied': False}}
    # Deny accidental reproduction of source IDs, names and locator URLs in any exported value.
    exported = encoded({'pack': pack, 'inventory': inventory, 'audit': audit}).decode()
    sensitive_ids = {key for mapping in maps.values() for key in mapping if len(key) >= 7}
    if any('"' + value + '"' in exported for value in sensitive_ids):
        raise ValueError('Privacy check failed: source identifier in exported strings')
    selected_profile_names = {str(row['student_name']) for row in profiles if sid(row['student_uid']) in maps['students']}
    selected_profile_names.add(str(teacher['teacher_name']))
    if any(json.dumps(name, ensure_ascii=False) in exported for name in selected_profile_names if len(name) >= 2):
        raise ValueError('Privacy check failed: source name collision; choose independent aliases')
    if 'http://' in exported or 'https://' in exported:
        raise ValueError('Privacy check failed: external locator copied')
    products = {'pack.json': pack, 'source-inventory.json': inventory, 'audit.json': audit}
    if check:
        for filename, value in products.items():
            if (OUTPUT / filename).read_bytes() != encoded(value):
                raise ValueError('Generated output drift: ' + filename)
    else:
        PRIVATE.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(PRIVATE, 0o700)
        private_path = PRIVATE / 'identity-map-and-transform.json'
        private_path.write_bytes(encoded(private_evidence))
        os.chmod(private_path, 0o600)
        OUTPUT.mkdir(parents=True, exist_ok=True)
        for filename, value in products.items():
            (OUTPUT / filename).write_bytes(encoded(value))
    print(json.dumps({'result': 'verified' if check else 'generated', 'version': VERSION,
                      'sourceFilesUnchanged': source_verified, 'classes': len(classes),
                      'students': len(students), 'homeworks': len(inventory['homeworks']),
                      'studentWorkRows': len(inventory['studentWork']), 'syntheticEvents': len(events)}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Read-only reproducibility and privacy verification')
    main(parser.parse_args().check)
